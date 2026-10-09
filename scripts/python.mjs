import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const candidates = [process.env.JALSETU_PYTHON, resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), resolve(root, '../../work/jalsetu-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')].filter(Boolean);
const python = candidates.find(existsSync);
if (!python) { console.error('Create .venv and install services/planner/requirements.txt, or set JALSETU_PYTHON.'); process.exit(1); }
const result = spawnSync(python, process.argv.slice(2), { cwd: root, stdio: 'inherit', env: { ...process.env, OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1', NUMEXPR_NUM_THREADS: '1', PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONPATH: [resolve(root, 'services/planner'), process.env.PYTHONPATH].filter(Boolean).join(delimiter) } });
if (result.error) { console.error(result.error.message); process.exit(1); }
if (result.status !== 0) console.error(`Python command failed (exit ${result.status ?? 'none'}, signal ${result.signal ?? 'none'}).`);
process.exit(result.status ?? 1);
