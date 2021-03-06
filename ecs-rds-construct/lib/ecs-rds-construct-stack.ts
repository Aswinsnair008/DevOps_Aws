import { Vpc, Subnet, SubnetType, SecurityGroup, Peer, Port } from '@aws-cdk/aws-ec2';
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import { CfnDBCluster, CfnDBSubnetGroup } from '@aws-cdk/aws-rds';
import secretsManager = require('@aws-cdk/aws-secretsmanager');
import ssm = require('@aws-cdk/aws-ssm');
import * as cdk from '@aws-cdk/core';

export class EcsRdsConstructStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const serviceName = 'my-service';
    const databaseName = 'my_rdsdatabase'
    const databaseUsername = 'project_deployer'
    const stage = 'dev';

    const vpc = new Vpc(this, 'MyVPC', { 
      cidr: '10.0.0.0/16',
      subnetConfiguration: [ 
        { name: 'elb_public_subnet', subnetType: SubnetType.PUBLIC },
        { name: 'ecs_private_subnet', subnetType: SubnetType.PRIVATE },
        { name: 'aurora_isolated_subnet', subnetType: SubnetType.ISOLATED }
      ]
    });
    const subnetIds: string[] = [];
    vpc.isolatedSubnets.forEach((subnet, index) => {
      subnetIds.push(subnet.subnetId);
    });

    const dbSubnetGroup: CfnDBSubnetGroup = new CfnDBSubnetGroup(this, 'AuroraSubnetGroup', {
      dbSubnetGroupDescription: 'Subnet group to access aurora',
      dbSubnetGroupName: 'aurora-serverless-subnet-group',
      subnetIds
    });

    const databaseCredentialsSecret = new secretsManager.Secret(this, 'DBCredentialsSecret', {
      secretName: `${serviceName}-${stage}-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: databaseUsername,
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });

    new ssm.StringParameter(this, 'DBCredentialsArn', {
      parameterName: `${serviceName}-${stage}-credentials-arn`,
      stringValue: databaseCredentialsSecret.secretArn,
    });

    const dbClusterSecurityGroup = new SecurityGroup(this, 'DBClusterSecurityGroup', { vpc });
    // A better security approach would be allow ingress from private subnet only
    dbClusterSecurityGroup.addIngressRule(Peer.ipv4('10.0.0.0/16'), Port.tcp(5432));

    const dbConfig = {
      dbClusterIdentifier: `${serviceName}-${stage}-cluster`,
      engineMode: 'serverless',
      engine: 'aurora-postgresql',
      engineVersion: '10.7',
      databaseName: databaseName,
      masterUsername: databaseCredentialsSecret.secretValueFromJson('username').toString(),
      masterUserPassword: databaseCredentialsSecret.secretValueFromJson('password').toString(),
      // Note: aurora serverless cluster can be accessed within its VPC only
      // https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html
      dbSubnetGroupName: dbSubnetGroup.dbSubnetGroupName,
      scalingConfiguration: {
        autoPause: true,
        maxCapacity: 2,
        minCapacity: 2,
        secondsUntilAutoPause: 3600,
      },
      vpcSecurityGroupIds: [
        dbClusterSecurityGroup.securityGroupId
      ]
    };

    const rdsCluster = new CfnDBCluster(this, 'DBCluster', dbConfig);
    rdsCluster.addDependsOn(dbSubnetGroup)

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });
    const loadBalancedService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "FargateService", {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:latest'),
        environment: {
          DATABASE_HOST: rdsCluster.attrEndpointAddress,
          DATABASE_NAME: databaseName,
          // TODO: use secret instead of environment
          DATABASE_USERNAME: databaseCredentialsSecret.secretValueFromJson('username').toString(),
          DATABASE_PASSWORD: databaseCredentialsSecret.secretValueFromJson('password').toString(),
        }
      },
    });
  }
}