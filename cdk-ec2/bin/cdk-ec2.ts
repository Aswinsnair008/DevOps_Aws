import * as cdk from 'aws-cdk-lib';
import { Ec2CdkStack } from '../lib/cdk-ec2-stack';

const app = new cdk.App();

new Ec2CdkStack(app, 'Ec2CdkStack', {});