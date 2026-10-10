import assert from 'node:assert/strict';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createFoundation } from './app.mjs';
import { resolve } from 'node:path';
import { deploymentScope } from './deployment-scope.mjs';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// The deployment review uses this exact bootstrap template. Prevent an
// accidental return to CDK's administrator or cross-account defaults.
const bootstrap = JSON.parse(readFileSync(new URL('./bootstrap-template.json', import.meta.url)));
assert.equal(bootstrap.Parameters.FileAssetsBucketKmsKeyId.Default, 'AWS_MANAGED_KEY');
const bootstrapText = JSON.stringify(bootstrap);
assert.ok(!bootstrapText.includes('policy/AdministratorAccess'));
for (const name of ['FilePublishingRole', 'ImagePublishingRole', 'LookupRole', 'DeploymentActionRole', 'LocalDeploymentSessionRole']) {
  const trust = bootstrap.Resources[name].Properties.AssumeRolePolicyDocument.Statement;
  assert.ok(trust.every(s => s.Principal.AWS.Ref === 'AWS::AccountId'));
}
const executionStatements = bootstrap.Resources.CloudFormationExecutionRole.Properties.Policies[0].PolicyDocument.Statement;
for (const statement of executionStatements) {
  const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
  assert.ok(actions.every(a => !/^(organizations|account|billing|bedrock|geo):/.test(a)));
  if (actions.some(a => a.startsWith('iam:'))) {
    assert.equal(statement.Resource['Fn::Sub'], 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/JalSetuDemo-*');
    assert.ok(!actions.some(a => /User|AccessKey|LoginProfile|CreatePolicy|PolicyVersion/.test(a)));
  }
  if (actions.includes('iam:PassRole')) {
    assert.deepEqual(statement.Condition.StringEquals['iam:PassedToService'], ['lambda.amazonaws.com', 'states.amazonaws.com', 'apigateway.amazonaws.com']);
  }
}
assert.equal(bootstrap.Resources.ContainerAssetsRepository.Properties.RepositoryPolicyText.Statement.length, 1);
assert.ok(bootstrap.Resources.ContainerAssetsRepository.Properties.RepositoryPolicyText.Statement[0].Condition.StringLike['aws:sourceArn']['Fn::Sub'].endsWith('function:JalSetuDemo-*'));
const sessionStatements = bootstrap.Resources.LocalDeploymentSessionRole.Properties.Policies[0].PolicyDocument.Statement;
assert.ok(sessionStatements.every(s => s.Action.every(a => /^(sts:AssumeRole|sts:GetCallerIdentity|ssm:GetParameter|cloudformation:(Describe|Get|List))/.test(a))));
assert.deepEqual(sessionStatements[0].Resource.map(r => r['Fn::GetAtt'][0]), ['FilePublishingRole', 'ImagePublishingRole', 'LookupRole', 'DeploymentActionRole']);

const scopeNow = Date.parse('2026-10-10T00:00:00Z');
const liveEnv = { JALSETU_EXPIRES_AT: '2026-10-17T00:00:00Z' };
assert.equal(deploymentScope(liveEnv, scopeNow).region, 'ap-south-1');
for (const expiry of [undefined, '2099-01-01T00:00:00Z', '2026-10-10T00:00:00Z', '2026-10-17T00:00:01Z', '2026-02-30T00:00:00Z', '2026-10-16']) {
  assert.throws(() => deploymentScope({ JALSETU_EXPIRES_AT: expiry }, scopeNow));
}
assert.throws(() => deploymentScope({ ...liveEnv, JALSETU_REGION: 'us-east-1' }, scopeNow));

// Exercise the command entry that previously exited silently through a
// Windows junction instead of applying the deployment guard.
const invalidCommand = spawnSync(process.execPath, [resolve(process.cwd(), 'infra/app.mjs')], {
  env: { ...process.env, JALSETU_EXPIRES_AT: '' }, encoding: 'utf8', timeout: 30_000,
});
assert.ok(!invalidCommand.error, invalidCommand.error?.message);
assert.notEqual(invalidCommand.status, 0);
assert.match(invalidCommand.stderr, /Set JALSETU_EXPIRES_AT/);

const app = new App({ outdir: resolve(import.meta.dirname, '../../../work/infra-synth') });
// This far-future value is test data, never a live hosting authorization.
const stack = createFoundation(app, { region: 'ap-south-1', expiry: '2099-01-01T00:00:00Z' });
const template = Template.fromStack(stack);
template.resourceCountIs('AWS::Lambda::Function', 2);
template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
template.hasResourceProperties('AWS::StepFunctions::StateMachine', { StateMachineType: 'STANDARD' });
template.hasResourceProperties('AWS::Events::Rule', { EventPattern: { source: ['aws.states'], 'detail-type': ['Step Functions Execution Status Change'], detail: { status: ['FAILED', 'TIMED_OUT', 'ABORTED'] } } });
const machine = Object.values(template.findResources('AWS::StepFunctions::StateMachine'))[0].Properties;
const definition = JSON.parse(machine.DefinitionString['Fn::Join'][1].map(part => typeof part === 'string' ? part : 'TOKEN').join(''));
assert.equal(definition.TimeoutSeconds, 360);
assert.equal(definition.StartAt, 'LoadAndValidate');
const names = ['LoadAndValidate', 'GetRouteMatrix', 'SolveStrategies', 'ValidatePlans', 'PersistResult', 'ExplainResult', 'CompleteJob'];
for (const [index, name] of names.entries()) {
  const state = definition.States[name];
  assert.equal(state.Parameters.Payload.stage, name);
  assert.equal(state.ResultPath, null); // Never pass large route/input payloads.
  assert.deepEqual(Object.keys(state.Parameters.Payload).sort(), ['correlation_id.$', 'job_id.$', 'owner.$', 'stage']);
  assert.equal(state.Retry[0].MaxAttempts, 2);
  assert.ok(!state.Retry[0].ErrorEquals.includes('States.ALL'));
  assert.equal(state.Catch[0].Next, name === 'ExplainResult' ? 'DeterministicExplanation' : 'FailJob');
  if (index < names.length - 1) assert.equal(state.Next, names[index + 1]);
}
assert.equal(definition.States.DeterministicExplanation.Next, 'CompleteJob');
assert.equal(definition.States.FailJob.Next, 'PlanningFailed');
template.resourceCountIs('AWS::Cognito::UserPool', 1);
template.hasResourceProperties('AWS::Cognito::UserPool', { AdminCreateUserConfig: { AllowAdminCreateUserOnly: true } });
template.hasResourceProperties('AWS::Cognito::UserPoolClient', { GenerateSecret: false, AllowedOAuthFlows: ['code'] });
template.hasResourceProperties('AWS::S3::Bucket', { PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true } });
template.hasResourceProperties('AWS::DynamoDB::Table', { BillingMode: 'PAY_PER_REQUEST', TimeToLiveSpecification: { AttributeName: 'expires_at', Enabled: true } });
for (const resource of Object.values(template.findResources('AWS::ApiGateway::Method'))) {
  if (resource.Properties.HttpMethod !== 'OPTIONS') assert.equal(resource.Properties.AuthorizationType, 'COGNITO_USER_POOLS');
}
for (const resource of Object.values(template.findResources('AWS::Lambda::Function'))) {
  assert.ok(resource.Properties.ReservedConcurrentExecutions <= 2);
  assert.equal(resource.Properties.Environment.Variables.DAILY_JOB_LIMIT, '100');
}
app.synth();
console.log('CDK synth and foundation assertions passed locally. No AWS resources were deployed.');
