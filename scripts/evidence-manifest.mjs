import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),files=[];
const ignored=new Set(['node_modules','__pycache__','.pytest_cache','.ruff_cache','cdk.out','dist','.venv','local-state']);
async function walk(path){for(const item of await readdir(path,{withFileTypes:true})){if(ignored.has(item.name))continue;const full=resolve(path,item.name);if(item.isDirectory())await walk(full);else if(item.isFile()&&!item.name.startsWith('.env')&&item.name!=='evidence-manifest.json'&&!item.name.endsWith('.pyc'))files.push(full);}}
for(const dir of ['apps','packages','services','infra','scripts','data','docs'])await walk(resolve(root,dir));
for(const file of ['README.md','NOTICE.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','.gitignore','.gitattributes','.dockerignore','.editorconfig','.env.example','Start JalSetu.cmd'])files.push(resolve(root,file));
const revision=spawnSync('git',['rev-parse','--verify','HEAD'],{cwd:root,encoding:'utf8'});
const remote=spawnSync('git',['remote','get-url','origin'],{cwd:root,encoding:'utf8'});
const remoteUrl=remote.status===0?remote.stdout.trim():'';
const repository=/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(remoteUrl)?remoteUrl.replace(/\.git$/,''):null;
let publicVerified=false, publicVerifiedAt=null;
if(process.argv.includes('--verify-public-repository')){
  if(!repository)throw new Error('A GitHub HTTPS origin is required for public-repository verification.');
  const check=spawnSync('gh',['repo','view',repository,'--json','visibility,url'],{cwd:root,encoding:'utf8'});
  if(check.status!==0)throw new Error('GitHub repository visibility could not be verified.');
  const result=JSON.parse(check.stdout);
  if(result.visibility!=='PUBLIC'||result.url!==repository)throw new Error('The origin is not the verified public repository.');
  publicVerified=true;publicVerifiedAt=new Date().toISOString();
}
const status=spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'});
const records=await Promise.all(files.sort().map(async path=>({path:relative(root,path).replaceAll('\\','/'),sha256:createHash('sha256').update(await readFile(path)).digest('hex')})));
const manifest={schema_version:'1.0',generated_at:new Date().toISOString(),scope:'local example and declared-record software evidence; no field outcome, cloud deployment or submission claimed',git_commit:revision.status===0?revision.stdout.trim():null,working_tree_dirty:status.status===0?Boolean(status.stdout.trim()):null,submitted_commit:null,urls:{repository,deployed_demo:null,video:null,article:null},public_repository_verified:publicVerified,public_repository_verified_at:publicVerifiedAt,limitations:'docs/limitations.md',files:records};
await writeFile(resolve(root,'docs/evidence-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Recorded ${records.length} artifact hashes; public repository ${publicVerified?'verified through GitHub':'not verified on this run'}; deployment and submission remain unclaimed.`);
