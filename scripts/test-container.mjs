import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const image = process.argv[2] ?? 'jalsetu-local-check:2026-10-10';
const name = 'jalsetu-offline-check-' + randomUUID();
const mount = ['-e', 'PYTHONPATH=/var/task', '--mount', `type=bind,source=${resolve(root, 'scripts')},target=/checks,readonly`];
const credentials = ['AWS_ACCESS_KEY_ID=offline-test', 'AWS_SECRET_ACCESS_KEY=offline-test',
  'AWS_DEFAULT_REGION=ap-south-1', 'AWS_EC2_METADATA_DISABLED=true', 'TABLE_NAME=offline-test',
  'SNAPSHOT_BUCKET=offline-test', 'PLANNER_WORKFLOW=offline-test', 'DAILY_JOB_LIMIT=100',
  'DEMO_EXPIRES_AT=2099-10-10T00:00:00Z', 'WEB_ORIGIN=https://example.invalid'].flatMap(value => ['-e', value]);
function docker(args) {
  const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', timeout: 55_000 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr ?? result.stdout);
  return result.stdout.trim();
}
console.log(docker(['run', '--rm', '--network', 'none', ...mount, '--entrypoint', 'python',
  image, '/checks/check-container.py']));
try {
  docker(['run', '-d', '--name', name, '--network', 'none', ...mount, ...credentials, image]);
  console.log(docker(['exec', name, 'python', '/checks/check-container.py', 'runtime']));
} finally {
  // Only the uniquely named test container created by this script is removed.
  docker(['rm', '-f', name]);
}
