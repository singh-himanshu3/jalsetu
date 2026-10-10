import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { recordsApi, roadKey, storedRoads } from './local-records.mjs';
import { readRecordSites, recordHeaders, recordTemplate } from '../apps/web/src/record-csv.mjs';
import { encodeCsv } from '../apps/web/src/csv.mjs';

// Everything below declares synthetic resources. Frozen public roads test wiring,
// never actual operator or field evidence. No provider request is made.
assert.ok(recordTemplate().includes('Point name'));
assert.ok(!recordTemplate().includes('2500'));
const sample = ['TEST point','77.19','28.70','2500','600','2500','08:00','12:00','20','high','TEST priority','confirmed'];
const csv = encodeCsv([recordHeaders, sample]);
assert.equal(readRecordSites(csv,'2026-10-10')[0].requested_litres,2500);
for(const [index,bad] of [[1,''],[3,'25.5'],[6,'24:10'],[2,'not a coordinate']]) {
  const row=[...sample];row[index]=bad;assert.throws(()=>readRecordSites(encodeCsv([recordHeaders,row]),'2026-10-10'));
}
assert.throws(()=>readRecordSites(encodeCsv([recordHeaders,...Array.from({length:21},()=>sample)]),'2026-10-10'));
const root=resolve(import.meta.dirname,'..');await mkdir(join(root,'tmp'),{recursive:true});
const directory=await mkdtemp(join(root,'tmp','record-check-'));
const source=JSON.parse(await readFile(join(root,'data/public-roads/north-delhi-osrm.json'),'utf8'));
const input=JSON.parse(await readFile(join(root,'data/evaluation/finish_by_close_parallel/north_delhi_example.json'),'utf8'));
input.data_mode='operator_entered';input.name='SYNTHETIC record wiring test';input.display_warning='TEST declarations only, not actual operator records';
input.operational_source={description:'SYNTHETIC test dispatch log',recorded_date:'2026-10-10',reviewed:true};
for(const row of [input.depot,...input.vehicles,...input.sites])row.provenance='operator_entered';
input.solver_time_limit_seconds=2;
input.travel_matrix={snapshot_id:`OSRM-${source.content_sha256.slice(0,16)}`,node_ids:source.request.nodes.map(n=>n.id),
  durations_seconds:source.payload.durations.map(r=>r.map(Math.ceil)),distances_metres:source.payload.distances.map(r=>r.map(Math.ceil)),
  provider:source.provider,provenance:'public_snapshot',retrieved_at:source.retrieved_at,represented_at:source.payload.data_version??null,
  source_url:source.request.url,attribution:source.attribution,limitations:source.limitations};
const roads=join(directory,'roads');let calls=0;
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
const error=(res,status,code,message)=>send(res,status,{error:{code,message}});
const adapter=recordsApi({directory:roads,send,error,run:async()=>{calls++;return {input,road_snapshot:source};}});
const fake=http.createServer(async(req,res)=>{if(!await adapter.handle(req,res))error(res,404,'NOT_FOUND','Not found');});
await new Promise(r=>fake.listen(0,'127.0.0.1',r));
let child;
const post=async(base,path,body,headers={},method='POST')=>{
  const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID(),...headers},body:JSON.stringify(body)});
  return {httpStatus:res.status,...await res.json()};
};
async function start() {
  child=spawn(process.execPath,['scripts/local-api.mjs','--serve-web'],{cwd:root,env:{...process.env,JALSETU_PORT:'0',JALSETU_STATE_DIR:directory,JALSETU_LOCAL_STATE:''},stdio:['ignore','pipe','pipe']});
  return await new Promise((ok,no)=>{
    let output='';const timer=setTimeout(()=>no(new Error('Local test server did not start')),15000);
    child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);ok(m[0]);}});
    child.on('error',no);child.on('exit',code=>{clearTimeout(timer);if(code)no(new Error('Local test server exited'));});
  });
}
async function stop(){if(child&&!child.killed){const done=new Promise(r=>child.once('exit',r));child.kill();await done;}}
try {
  const fakeBase=`http://127.0.0.1:${fake.address().port}`;
  assert.equal((await post(fakeBase,'/v1/records/roads',{input})).httpStatus,400);assert.equal(calls,0);
  assert.equal((await post(fakeBase,'/v1/records/roads',{input,allow_coordinate_sharing:true})).httpStatus,200);
  assert.equal(calls,1);assert.deepEqual(await storedRoads(roads,input),source);
  assert.equal((await post(fakeBase,'/v1/records/roads',{input,allow_coordinate_sharing:true})).httpStatus,429);
  await new Promise(r=>fake.close(r));
  let base=await start();
  const created=await post(base,'/v1/projects',{name:'SYNTHETIC test record project',operating_date:'2026-10-10',data_mode:'operator_entered'});
  assert.equal(created.httpStatus,200);const project=created.project;
  assert.equal(project.input.depot.available_stock_litres,null);assert.equal(project.input.depot.location.latitude,null);
  assert.equal(project.input.travel_matrix,null);assert.deepEqual(project.input.vehicles,[]);assert.deepEqual(project.input.sites,[]);
  input.project_id=project.project_id;
  const url=`/v1/projects/${project.project_id}`;
  assert.equal((await post(base,url,{input:{...input,data_mode:'example'}},{'If-Match':'1'},'PUT')).httpStatus,400);
  const saved=await post(base,url,{input},{'If-Match':'1'},'PUT');assert.equal(saved.httpStatus,200);
  const review=await post(base,'/v1/records/review',{input:{...input,travel_matrix:null}});
  assert.equal(review.httpStatus,200);assert.equal(review.input.travel_matrix,null);
  let job=(await post(base,'/v1/planning-jobs',{input}));assert.equal(job.httpStatus,202);
  const deadline=Date.now()+20000;
  while(!['completed','failed'].includes(job.status)&&Date.now()<deadline){await new Promise(r=>setTimeout(r,150));job=await(await fetch(base+`/v1/planning-jobs/${job.job_id}`)).json();}
  assert.equal(job.status,'completed',JSON.stringify(job.error));assert.equal(job.plans.length,4);
  assert.ok(job.plans.every(p=>p.validation.valid));
  const approval=await post(base,'/v1/approvals',{job_id:job.job_id,strategy:'jalsetu',actor:'Synthetic test reviewer'});
  assert.equal(approval.httpStatus,200);assert.equal(approval.operation.input.data_mode,'operator_entered');
  const route=approval.operation.approved_plan.vehicle_routes[0],stopPoint=route.stops[0];
  const eventUrl=`/v1/operations/${approval.operation.operation_id}/events`;
  const loaded=await post(base,eventUrl,{event:{event_type:'vehicle_loaded',occurred_at:route.loading_started_at,
    payload:{vehicle_id:route.vehicle_id,litres:route.planned_load_litres}}},{'If-Match':String(approval.operation.version)});
  assert.equal(loaded.httpStatus,200,JSON.stringify(loaded.error));
  const delivered=await post(base,eventUrl,{event:{event_type:'delivery_reported',occurred_at:stopPoint.estimated_departure,
    payload:{vehicle_id:route.vehicle_id,site_id:stopPoint.site_id,litres:stopPoint.planned_litres}}},{'If-Match':String(loaded.operation.version)});
  assert.equal(delivered.httpStatus,200,JSON.stringify(delivered.error));assert.equal(delivered.operation.events.length,2);
  await stop();base=await start();
  assert.deepEqual((await(await fetch(base+url)).json()).project,saved.project);
  assert.deepEqual(await storedRoads(roads,input),source);
  assert.deepEqual((await(await fetch(base+`/v1/operations/${approval.operation.operation_id}`)).json()).operation,delivered.operation);
  assert.equal((await post(base,'/v1/validate-input',{input})).httpStatus,200);
  const changed=structuredClone(input);changed.sites[0].location.longitude+=.00001;
  assert.equal((await post(base,'/v1/validate-input',{input:changed})).httpStatus,400);
  const tampered=structuredClone(input);tampered.travel_matrix.durations_seconds[0][1]+=1;
  assert.equal((await post(base,'/v1/validate-input',{input:tampered})).httpStatus,400);
  await writeFile(join(roads,`${roadKey(input.travel_matrix)}.json`),'corrupt');
  assert.equal((await post(base,'/v1/validate-input',{input})).httpStatus,400);
  console.log('Record checks passed: blank projects, readable CSV, sharing guard, cooldown, saved roads, real-process planning/approval/loading/delivery/restart, stale locations and corrupt/tampered road rejection. Synthetic operational test data only; no provider calls.');
} finally {await stop();if(fake.listening)await new Promise(r=>fake.close(r));if(!resolve(directory).startsWith(join(root,'tmp')+sep))throw new Error('Test cleanup path escaped its workspace');await rm(directory,{recursive:true,force:true});}
