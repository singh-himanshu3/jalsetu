import assert from 'node:assert/strict';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createFoundation } from './app.mjs';
import { resolve } from 'node:path';

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
