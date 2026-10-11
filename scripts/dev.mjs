import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
console.log('Offline developer workspace: http://127.0.0.1:5173/local-workspace (loopback only; no Google sign-in). Public introduction: /');
const children = [spawn(process.execPath, [resolve(root, 'scripts/local-api.mjs')], { stdio: 'inherit' }), spawn(process.execPath, [resolve(root, 'apps/web/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--strictPort'], { cwd: resolve(root, 'apps/web'), env:{...process.env,VITE_JALSETU_LOCAL_DEVELOPMENT:'true'}, stdio: 'inherit' })];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill(); process.exit(code); }
for (const child of children) { child.on('error', () => stop(1)); child.on('exit', code => { if (!stopping) stop(code ?? 1); }); }
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
