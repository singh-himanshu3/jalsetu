// Arithmetic only: reads the reviewed public price snapshot, makes no AWS calls.
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../docs/aws-price-snapshot-2026-10-09.json', import.meta.url)));
const rates = snapshot.rates;
const phase4 = !process.argv.includes('--phase3');
const cases = {
  small_demo: { jobs: 100, workerSeconds: 10, apiCalls: 10_000, apiSeconds: 0.25,
    readUnits: 100_000, writeUnits: 5_000, s3Gets: 100_000, s3Puts: 5_000,
    s3GBMonths: 0.1, dynamoGBMonths: 0.01, logGB: 0.05, logGBMonths: 0.05 * 7 / 30,
    userMonths: 40, ecrGBMonths: 2, buildMinutes: 30, amplifyGBMonths: 0.1,
    amplifyTransferGB: 1, apiTransferGB: 0.5 },
  high_usage_example: { jobs: 800, workerSeconds: 120, apiCalls: 200_000, apiSeconds: 25,
    readUnits: 2_000_000, writeUnits: 50_000, s3Gets: 2_000_000, s3Puts: 50_000,
    s3GBMonths: 2, dynamoGBMonths: 0.1, logGB: 2, logGBMonths: 2 * 7 / 30,
    userMonths: 40, ecrGBMonths: 2, buildMinutes: 30, amplifyGBMonths: 0.1,
    amplifyTransferGB: 10, apiTransferGB: 10 },
};
for (const [name, input] of Object.entries(cases)) {
  const workerSeconds = phase4 ? (name === 'small_demo' ? 20 : 420) : input.workerSeconds;
  const stagesPerJob = phase4 ? (name === 'small_demo' ? 8 : 32) : 1;
  const quantities = {
    lambda_compute: input.jobs * 2 * workerSeconds + input.apiCalls * 0.5 * input.apiSeconds,
    lambda_requests: input.jobs * stagesPerJob + input.apiCalls, rest_requests: input.apiCalls,
    dynamo_read: input.readUnits, dynamo_write: input.writeUnits, dynamo_storage: input.dynamoGBMonths,
    s3_get: input.s3Gets, s3_put: input.s3Puts, s3_storage: input.s3GBMonths,
    logs_ingest: input.logGB, logs_storage: input.logGBMonths, cognito_essentials: input.userMonths,
    ecr_storage: input.ecrGBMonths, amplify_build: input.buildMinutes, amplify_storage: input.amplifyGBMonths,
    amplify_transfer: input.amplifyTransferGB, api_transfer: input.apiTransferGB,
    ...(phase4 ? { state_transitions: input.jobs * stagesPerJob } : {}),
  };
  const lines = Object.fromEntries(Object.entries(quantities).map(([key, quantity]) => [
    key, { quantity, unit: rates[key].unit, usd: +(quantity * rates[key].usd_per_unit).toFixed(6) },
  ]));
  const subtotal = Object.values(lines).reduce((total, line) => total + line.usd, 0);
  console.log(JSON.stringify({ scenario: name, phase: phase4 ? 4 : 3, region: snapshot.region, assumptions: {...input, workerSeconds, stagesPerJob}, lines,
    before_free_allowances_or_credits_usd: +subtotal.toFixed(2),
    with_10_usd_contingency: +(subtotal + 10).toFixed(2),
    limitation: 'An assumed workload estimate, not an enforced monetary ceiling or measured AWS runtime.',
  }, null, 2));
}
