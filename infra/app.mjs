import { App, Stack, Duration, RemovalPolicy, CfnOutput, Tags } from 'aws-cdk-lib';
import { aws_amplify as amplify, aws_cognito as cognito, aws_apigateway as apigateway, aws_lambda as lambda, aws_dynamodb as dynamodb, aws_s3 as s3, aws_logs as logs, aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks, aws_events as events, aws_events_targets as targets } from 'aws-cdk-lib';
import { resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { deploymentScope } from './deployment-scope.mjs';

export function createFoundation(app, { region = 'ap-south-1', expiry, account } = {}) {
  if (!expiry || Number.isNaN(Date.parse(expiry))) throw new Error('Set an explicit ISO deployment expiry; hosting is authorized for seven days.');
  const stack = new Stack(app, 'JalSetuDemo', { env: { region, ...(account ? { account } : {}) } });
  Tags.of(stack).add('Project', 'JalSetu');
  Tags.of(stack).add('DataMode', 'example-only');
  Tags.of(stack).add('ExpiresAt', expiry);
  // Private state is retained on accidental stack deletion. Cleanup is explicit.
  const table = new dynamodb.Table(stack, 'State', { partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING }, billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, timeToLiveAttribute: 'expires_at', removalPolicy: RemovalPolicy.RETAIN });
  const snapshots = new s3.Bucket(stack, 'Snapshots', { encryption: s3.BucketEncryption.S3_MANAGED, blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, enforceSSL: true, removalPolicy: RemovalPolicy.RETAIN, lifecycleRules: [{ expiration: Duration.days(8) }] });
  const hosting = new amplify.CfnApp(stack, 'Hosting', { name: 'jalsetu-example-demo', platform: 'WEB', customRules: [{ source: '/<*>', target: '/index.html', status: '404-200' }] });
  new amplify.CfnBranch(stack, 'MainBranch', { appId: hosting.attrAppId, branchName: 'main', stage: 'PRODUCTION', enableAutoBuild: false });
  const origin = `https://main.${hosting.attrDefaultDomain}`;
  const pool = new cognito.UserPool(stack, 'Coordinators', { selfSignUpEnabled: false, signInAliases: { username: true }, passwordPolicy: { minLength: 12, requireDigits: true, requireLowercase: true, requireUppercase: true, requireSymbols: true }, removalPolicy: RemovalPolicy.RETAIN });
  const client = pool.addClient('WebClient', { generateSecret: false, oAuth: { flows: { authorizationCodeGrant: true }, scopes: [cognito.OAuthScope.OPENID], callbackUrls: [origin], logoutUrls: [origin] }, preventUserExistenceErrors: true, idTokenValidity: Duration.hours(1), accessTokenValidity: Duration.hours(1), refreshTokenValidity: Duration.days(1) });
  const domain = pool.addDomain('LoginDomain', { cognitoDomain: { domainPrefix: `jalsetu-${stack.account}-${region}` } });
  const code = lambda.DockerImageCode.fromImageAsset(resolve(import.meta.dirname, '..'), { file: 'services/cloud/Dockerfile', exclude: ['node_modules', 'apps', 'docs', 'local-state', '.git', 'cdk.out', 'infra'] });
  const environment = { TABLE_NAME: table.tableName, SNAPSHOT_BUCKET: snapshots.bucketName, DEMO_EXPIRES_AT: expiry, DAILY_JOB_LIMIT: '100', WEB_ORIGIN: origin };
  const workerLogs = new logs.LogGroup(stack, 'PlannerLogs', { retention: logs.RetentionDays.ONE_WEEK, removalPolicy: RemovalPolicy.RETAIN });
  const apiLogs = new logs.LogGroup(stack, 'ApiLogs', { retention: logs.RetentionDays.ONE_WEEK, removalPolicy: RemovalPolicy.RETAIN });
  const worker = new lambda.DockerImageFunction(stack, 'Planner', { code: lambda.DockerImageCode.fromImageAsset(resolve(import.meta.dirname, '..'), { file: 'services/cloud/Dockerfile', cmd: ['cloud.workflow.stage_handler'], exclude: ['node_modules', 'apps', 'docs', 'local-state', '.git', 'cdk.out', 'infra'] }), memorySize: 2048, timeout: Duration.seconds(120), reservedConcurrentExecutions: 1, environment, logGroup: workerLogs, retryAttempts: 2, maxEventAge: Duration.minutes(5) });
  const stageTask = (name, stage = name) => {
    const task = new tasks.LambdaInvoke(stack, name, { lambdaFunction: worker, payload: sfn.TaskInput.fromObject({ owner: sfn.JsonPath.stringAt('$.owner'), job_id: sfn.JsonPath.stringAt('$.job_id'), correlation_id: sfn.JsonPath.stringAt('$.correlation_id'), stage }), resultPath: sfn.JsonPath.DISCARD, retryOnServiceExceptions: false, taskTimeout: sfn.Timeout.duration(Duration.seconds(130)) });
    task.addRetry({ errors: ['Lambda.ServiceException', 'Lambda.AWSLambdaException', 'Lambda.SdkClientException', 'Lambda.TooManyRequestsException', 'WorkflowTransientError'], interval: Duration.seconds(2), backoffRate: 2, maxAttempts: 2 });
    return task;
  };
  const failJob = stageTask('FailJob').next(new sfn.Fail(stack, 'PlanningFailed', { error: 'PlanningFailed', cause: 'Read the owner-scoped job record for the safe error message.' }));
  const stages = ['LoadAndValidate', 'GetRouteMatrix', 'SolveStrategies', 'ValidatePlans', 'PersistResult', 'ExplainResult', 'CompleteJob'].map(name => stageTask(name));
  // Explanation is deterministic in this example release. Its catch path can
  // recover a transient persistence failure without discarding checked routes.
  const fallback = stageTask('DeterministicExplanation', 'ExplainResult');
  fallback.addCatch(failJob, { resultPath: sfn.JsonPath.DISCARD });
  fallback.next(stages[6]);
  for (const task of stages) task.addCatch(task === stages[5] ? fallback : failJob, { resultPath: sfn.JsonPath.DISCARD });
  const definition = stages.reduce((chain, task) => chain ? chain.next(task) : sfn.Chain.start(task), null);
  const workflow = new sfn.StateMachine(stack, 'PlanningWorkflow', { definitionBody: sfn.DefinitionBody.fromChainable(definition), stateMachineType: sfn.StateMachineType.STANDARD, timeout: Duration.minutes(6), tracingEnabled: false });
  // Workflow-level timeouts cannot be caught inside the state machine. Status
  // events repair the durable job; GET also repairs after the lease deadline.
  new events.Rule(stack, 'WorkflowTerminalFailure', { eventPattern: { source: ['aws.states'], detailType: ['Step Functions Execution Status Change'], detail: { stateMachineArn: [workflow.stateMachineArn], status: ['FAILED', 'TIMED_OUT', 'ABORTED'] } }, targets: [new targets.LambdaFunction(worker, { retryAttempts: 2, maxEventAge: Duration.minutes(5) })] });
  const apiFunction = new lambda.DockerImageFunction(stack, 'Api', { code, memorySize: 512, timeout: Duration.seconds(25), reservedConcurrentExecutions: 2, environment: { ...environment, PLANNER_WORKFLOW: workflow.stateMachineArn }, logGroup: apiLogs });
  table.grantReadWriteData(apiFunction); table.grantReadWriteData(worker);
  snapshots.grantReadWrite(apiFunction); snapshots.grantReadWrite(worker);
  workflow.grantStartExecution(apiFunction);
  const gatewayLogs = new logs.LogGroup(stack, 'GatewayLogs', { retention: logs.RetentionDays.ONE_WEEK, removalPolicy: RemovalPolicy.RETAIN });
  const authorizer = new apigateway.CognitoUserPoolsAuthorizer(stack, 'Authorization', { cognitoUserPools: [pool] });
  const rest = new apigateway.RestApi(stack, 'RestApi', { restApiName: 'jalsetu-example-api', defaultMethodOptions: { authorizer, authorizationType: apigateway.AuthorizationType.COGNITO }, defaultCorsPreflightOptions: { allowOrigins: [origin], allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'If-Match'] }, deployOptions: { throttlingRateLimit: 5, throttlingBurstLimit: 10, dataTraceEnabled: false, accessLogDestination: new apigateway.LogGroupLogDestination(gatewayLogs), accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({ caller: false, user: false }) } });
  rest.root.addProxy({ defaultIntegration: new apigateway.LambdaIntegration(apiFunction), defaultMethodOptions: { authorizer, authorizationType: apigateway.AuthorizationType.COGNITO } });
  for (const type of [apigateway.ResponseType.DEFAULT_4XX, apigateway.ResponseType.DEFAULT_5XX]) rest.addGatewayResponse(`Cors${type.responseType}`, { type, responseHeaders: { 'Access-Control-Allow-Origin': `'${origin}'`, 'Access-Control-Allow-Headers': "'Content-Type,Authorization,Idempotency-Key,If-Match'" } });
  // The browser receives only public configuration; no AWS credentials or client secret.
  const config = { mode: 'aws_live', region, apiBaseUrl: rest.url.replace(/\/$/, ''), clientId: client.userPoolClientId, loginBaseUrl: domain.baseUrl(), redirectUri: origin, expiresAt: expiry };
  new CfnOutput(stack, 'WebConfig', { value: stack.toJsonString(config) });
  new CfnOutput(stack, 'FrontendUrl', { value: origin });
  new CfnOutput(stack, 'AmplifyAppId', { value: hosting.attrAppId });
  new CfnOutput(stack, 'UserPoolId', { value: pool.userPoolId });
  new CfnOutput(stack, 'PlannerFunction', { value: worker.functionName });
  new CfnOutput(stack, 'PlanningWorkflowArn', { value: workflow.stateMachineArn });
  new CfnOutput(stack, 'StateTable', { value: table.tableName });
  new CfnOutput(stack, 'SnapshotBucket', { value: snapshots.bucketName });
  // No scheduled paid services or broad credentials are provisioned here.
  return stack;
}

// The project may be opened through a Windows junction. Resolve the command
// path just as Node resolves the imported module before detecting direct use.
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.filename) {
  const app = new App();
  createFoundation(app, deploymentScope(process.env));
  app.synth();
}
