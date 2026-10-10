import {readFile, writeFile, readdir, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {deploymentScope} from '../infra/deployment-scope.mjs';

const fields = ['mode', 'region', 'apiBaseUrl', 'clientId', 'loginBaseUrl', 'redirectUri', 'expiresAt'];
const assetTypes = new Set(['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.ico', '.webp', '.woff', '.woff2']);

// Only public browser configuration is copied from the deployed stack outputs.
export function hostedConfig(outputs, now = Date.now()) {
  const stack = outputs.JalSetuDemo;
  if (!stack || typeof stack.WebConfig !== 'string') throw new Error('Expected JalSetuDemo.WebConfig in the CDK outputs file.');
  const config = JSON.parse(stack.WebConfig);
  if (!config || Array.isArray(config) || Object.keys(config).sort().join() !== [...fields].sort().join()
      || fields.some(key => typeof config[key] !== 'string' || !config[key])) {
    throw new Error('WebConfig must contain only the seven public browser fields.');
  }
  if (config.mode !== 'aws_live') throw new Error('Expected the prepared AWS hosting mode.');
  deploymentScope({JALSETU_REGION:config.region, JALSETU_EXPIRES_AT:config.expiresAt}, now);
  const api = new URL(config.apiBaseUrl), login = new URL(config.loginBaseUrl), web = new URL(config.redirectUri);
  for (const url of [api, login, web]) {
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash) {
      throw new Error('Hosted addresses must use HTTPS without credentials, queries or fragments.');
    }
  }
  if (!/^[a-z0-9]+\.execute-api\.ap-south-1\.amazonaws\.com$/.test(api.hostname) || !/^\/[a-zA-Z0-9_-]+$/.test(api.pathname)) {
    throw new Error('Expected a Mumbai API Gateway stage address.');
  }
  if (!/^[a-z0-9-]+\.auth\.ap-south-1\.amazoncognito\.com$/.test(login.hostname) || login.pathname !== '/') {
    throw new Error('Expected a Mumbai Cognito sign-in address.');
  }
  if (!/^main\.[a-z0-9]+\.amplifyapp\.com$/.test(web.hostname) || config.redirectUri !== web.origin
      || stack.FrontendUrl !== web.origin || !/^[a-z0-9]+$/.test(config.clientId)) {
    throw new Error('Sign-in callback must match the prepared Amplify frontend.');
  }
  return config;
}

export async function prepareHostedWeb({outputs, build, destination, now = Date.now()}) {
  const config = hostedConfig(outputs, now);
  const files = new Map([['index.html', await readFile(resolve(build, 'index.html'))]]);
  async function collect(directory, prefix) {
    for (const item of await readdir(directory, {withFileTypes:true})) {
      const path = resolve(directory, item.name), name = `${prefix}/${item.name}`;
      if (item.isDirectory()) await collect(path, name);
      else if (item.isFile() && assetTypes.has(extname(item.name))) files.set(name, await readFile(path));
    }
  }
  await collect(resolve(build, 'assets'), 'assets');
  files.set('config.json', Buffer.from(JSON.stringify(config, null, 2) + '\n'));
  // Refuse an existing destination: stale bundles and private files cannot join the upload.
  await mkdir(destination);
  for (const [name, bytes] of files) {
    const path = resolve(destination, name);
    if (name.startsWith('assets/')) await mkdir(resolve(path, '..'), {recursive:true});
    await writeFile(path, bytes);
  }
  return [...files.keys()];
}

if (process.argv[1] === import.meta.filename) {
  try {
    const [outputsFile, destination] = process.argv.slice(2);
    if (!outputsFile || !destination) throw new Error('Usage: pnpm prepare:hosting <CDK outputs file> <new bundle folder>');
    const files = await prepareHostedWeb({outputs:JSON.parse(await readFile(resolve(outputsFile), 'utf8')),
      build:resolve(import.meta.dirname, '../apps/web/dist'), destination:resolve(destination)});
    console.log(`Prepared ${files.length} public frontend files. No AWS call or upload was made.`);
  } catch (error) { console.error(`Hosted bundle not prepared: ${error.message}`); process.exitCode = 1; }
}
