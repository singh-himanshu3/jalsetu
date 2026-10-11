import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, rmdir} from 'node:fs/promises';
import {join, resolve, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {hostedConfig, prepareHostedWeb} from './prepare-hosted-web.mjs';

const now = Date.parse('2026-10-10T00:00:00Z');
const config = {mode:'aws_live',authProvider:'GoogleAndEmail',issuer:'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_example123', region:'ap-south-1', apiBaseUrl:'https://example123.execute-api.ap-south-1.amazonaws.com/prod',
  clientId:'exampleclient123', loginBaseUrl:'https://jalsetu-example.auth.ap-south-1.amazoncognito.com',
  redirectUri:'https://main.example123.amplifyapp.com/auth/callback',logoutUri:'https://main.example123.amplifyapp.com/', expiresAt:'2026-10-17T00:00:00Z'};
const outputs = value => ({JalSetuDemo:{WebConfig:JSON.stringify(value), FrontendUrl:new URL(config.redirectUri).origin,
  SnapshotBucket:'private-example-bucket', StateTable:'private-example-table'}});
assert.deepEqual(hostedConfig(outputs(config), now), config);
assert.deepEqual(hostedConfig(outputs({...config,authProvider:'Email'}),now),{...config,authProvider:'Email'});
assert.throws(() => hostedConfig({}, now));
for (const edit of [
  {mode:'offline_fixture'}, {authProvider:'COGNITO'}, {issuer:'https://example.com/pool'}, {logoutUri:'https://example.com/'}, {region:'us-east-1'}, {expiresAt:'2026-10-18T00:00:00Z'}, {expiresAt:'2026-10-10T00:00:00Z'},
  {clientSecret:'never-publish'}, {apiBaseUrl:'https://example.com/prod'}, {apiBaseUrl:config.apiBaseUrl + '?token=private'},
  {apiBaseUrl:'https://example123.execute-api.us-east-1.amazonaws.com/prod'},
  {loginBaseUrl:'https://example.com'}, {redirectUri:config.redirectUri + '/other'},
]) assert.throws(() => hostedConfig(outputs({...config, ...edit}), now));
assert.throws(() => hostedConfig({...outputs(config), JalSetuDemo:{...outputs(config).JalSetuDemo, FrontendUrl:'https://main.other.amplifyapp.com'}}, now));

const scratch = await mkdtemp(join(tmpdir(), 'jalsetu-hosted-'));
const build = join(scratch, 'build'), destination = join(scratch, 'bundle');
const actual = join(scratch, 'actual-bundle');
let actualFiles = [];
try {
  await mkdir(join(build, 'assets'), {recursive:true});
  for (const [name, value] of [['index.html','<script src="/assets/app.js"></script>'], ['assets/app.js','// built app'],
    ['assets/app.css','body {}'], ['assets/app.js.map','private source'], ['config.json','private stale config'], ['.env','private credential']]) {
    await writeFile(join(build, name), value);
  }
  const files = await prepareHostedWeb({outputs:outputs(config), build, destination, now});
  assert.deepEqual(files.sort(), ['assets/app.css','assets/app.js','config.json','index.html']);
  assert.deepEqual(JSON.parse(await readFile(join(destination, 'config.json'), 'utf8')), config);
  assert.equal(await readFile(join(destination, 'assets/app.js'), 'utf8'), '// built app');
  const publicBytes = (await Promise.all(files.map(name => readFile(join(destination, name), 'utf8')))).join();
  assert.ok(!publicBytes.includes('private'));
  await assert.rejects(() => prepareHostedWeb({outputs:outputs(config), build, destination, now}), /EEXIST/);
  await assert.rejects(() => readFile(join(destination, '.env')));
  const actualBuild = resolve(import.meta.dirname, '../apps/web/dist');
  actualFiles = await prepareHostedWeb({outputs:outputs(config), build:actualBuild, destination:actual, now});
  const index = await readFile(join(actual, 'index.html'), 'utf8');
  assert.ok(!index.includes('@vite/client'));
  for (const match of index.matchAll(/(?:src|href)="\/(assets\/[^"?]+)"/g)) {
    assert.ok(actualFiles.includes(match[1]), `Missing built dependency ${match[1]}`);
    assert.deepEqual(await readFile(join(actual, match[1])), await readFile(join(actualBuild, match[1])));
  }
  assert.deepEqual(JSON.parse(await readFile(join(actual, 'config.json'), 'utf8')), config);
  console.log('Hosted bundle checks passed: real built dependencies, public files only, matching Mumbai endpoints/callback, seven-day expiry and stale-folder refusal. No AWS calls.');
} finally {
  // Remove only the explicit files and directories in this unique synthetic test folder.
  for (const name of ['index.html','assets/app.js','assets/app.css','assets/app.js.map','config.json','.env']) await rm(join(build,name), {force:true});
  for (const name of ['index.html','assets/app.js','assets/app.css','config.json']) await rm(join(destination,name), {force:true});
  const actualDirs = new Set([actual]);
  for (const name of actualFiles) {
    await rm(join(actual, name), {force:true});
    for (let dir = dirname(join(actual, name)); dir !== actual; dir = dirname(dir)) actualDirs.add(dir);
  }
  for (const dir of [...actualDirs].sort((a,b) => b.length - a.length)) {
    try { await rmdir(dir); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (const dir of [join(build,'assets'),build,join(destination,'assets'),destination,scratch]) {
    try { await rmdir(dir); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
