
Follow the steps to initialize typescript:

npm -g install typescript -----//install typescript 

npm install -g aws-cdk -----//install the aws cdk

cdk --version ------//to check the version
aws configure -----//configure aws by passing the ID and the region
cdk bootstrap aws://ACCOUNT-NUMBER/REGION  ---//need to do the bootstrapping before starting the stack this will creat a bucket and cdktools will be created along witht the metadata in our AWS account
mkdir ecs-rds-construct && cd ecs-rds-construct
cdk init --language typescript ----//this will initialize the typescript inside the directory we created
########################################################################################################################################################          

Note :If facing issues with the dependencies use the following format to install the dependencies-
npm i @aws-cdk/aws-rds ----when dependencies showing error(versions of the dependencies should match else you may get an error when trying to deploy)

#########################################################################################################################################################




## Other Useful commands
cdk synth ----//Save it and make sure it runs and creates a stack.
cdk deploy ----//Deploy the stack.
cdk destroy ----//To avoid unexpected AWS charges, destroy your AWS CDK stack after you're done with this exercise.

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
