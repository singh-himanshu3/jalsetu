import {spawnSync} from 'node:child_process';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),fixture='data/evaluation/finish_by_close_parallel/north_delhi_example.json';
const temp=await mkdtemp(join(tmpdir(),'jalsetu-landing-'));
try {
  const results=[];
  for(const strategy of ['jalsetu','demand_proportional']) {
    const output=join(temp,strategy+'.json');
    const run=spawnSync(process.execPath,['scripts/python.mjs','-m','jalsetu_planner','plan','--input',fixture,'--strategy',strategy,'--output',output],{cwd:root,stdio:'inherit'});
    assert.equal(run.status,0);results.push(JSON.parse(await readFile(output,'utf8')));
  }
  const [plan,baseline]=results,input=JSON.parse(await readFile(resolve(root,fixture),'utf8'));
  assert.ok(plan.validation.valid&&baseline.validation.valid);
  const result={fixture,inputSnapshotSha256:plan.input_snapshot_sha256,serviceWindowPolicy:input.service_window_policy,loadingMode:input.loading_mode,planned:plan.metrics.on_time_scheduled_litres,unmet:plan.metrics.unmet_requested_litres,minimum:plan.metrics.sites_meeting_minimum,confirmed:input.sites.filter(s=>s.confirmation_status==='confirmed').length,additional:plan.metrics.on_time_scheduled_litres-baseline.metrics.on_time_scheduled_litres,extraTravelKm:(plan.metrics.total_travel_distance_metres-baseline.metrics.total_travel_distance_metres)/1000};
  const target=resolve(root,'apps/web/src/landing-result.json');
  if(process.argv.includes('--write'))await writeFile(target,JSON.stringify(result,null,2)+'\n');
  else assert.deepEqual(JSON.parse(await readFile(target,'utf8')),result);
  console.log('Landing sample results verified against both current planner outputs.');
} finally {await rm(temp,{recursive:true,force:true});}
