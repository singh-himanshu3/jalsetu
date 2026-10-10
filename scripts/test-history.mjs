import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { encodeCsv } from '../apps/web/src/csv.mjs';
import { deliveryHeaders, dispatchHeaders, readHistoryCsv, historyTemplate, historyHtml } from '../apps/web/src/history-report.mjs';
import { recordsApi } from './local-records.mjs';
import http from 'node:http';

assert.ok(!historyTemplate('dispatch').includes('1000'));assert.ok(historyTemplate('deliveries').includes('Reported delivered litres'));
const row=['Synthetic vehicle','1','Synthetic point','1000','08:00'];
assert.equal(readHistoryCsv(encodeCsv([dispatchHeaders,row]),'2026-10-10','dispatch')[0].loading_started_at,'2026-10-10T08:00:00+05:30');
for(const [index,bad] of [[0,''],[1,'0'],[2,''],[3,'1.5'],[3,''],[4,'24:00']]){const r=[...row];r[index]=bad;assert.throws(()=>readHistoryCsv(encodeCsv([dispatchHeaders,r]),'2026-10-10','dispatch'));}
assert.throws(()=>readHistoryCsv(encodeCsv([dispatchHeaders,...Array.from({length:21},()=>row)]),'2026-10-10','dispatch'));
assert.throws(()=>readHistoryCsv(encodeCsv([dispatchHeaders.slice(1),row.slice(1)]),'2026-10-10','dispatch'));
assert.equal(readHistoryCsv(encodeCsv([deliveryHeaders,['Synthetic point','713','08:12','08:14']]),'2026-10-10','deliveries')[0].delivered_litres,713);
assert.equal(readHistoryCsv(encodeCsv([deliveryHeaders,['Synthetic point','0','','']]),'2026-10-10','deliveries')[0].arrived_at,null);
assert.throws(()=>readHistoryCsv(encodeCsv([deliveryHeaders,['Synthetic point','1','','']]),'2026-10-10','deliveries'));
const report={project_name:'<script>bad()</script>',data_mode:'operator_entered',operating_date:'2026-10-10',created_at:'2026-10-10T04:00:00Z',source_reference:'<img src=x onerror=bad()>',record_source:{description:'Synthetic regression',recorded_date:'2026-10-10'},settings:{closing_rule:'finish_by_close',loading_rule:'parallel',increment_litres:100,travel_time_multiplier:1},road_source:{provider:'TEST',retrieved_at:'2026-10-10T04:00:00Z',represented_at:null,source_url:null,attribution:'TEST',limitations:['Test estimate only']},resources:{depot_name:'Synthetic depot',stock_litres:1000,opens_at:'2026-10-10T02:30:00Z',closes_at:'2026-10-10T08:30:00Z',loading_minutes:10,vehicles:[]},original:{valid:true,issues:[],imported_planned_litres:1000,metrics:{on_time_scheduled_litres:1000},routes:[]},jalsetu:{approvable:true,issues:[],metrics:{on_time_scheduled_litres:900},routes:[]},comparison_ready:true,scheduled_difference_litres:-100,points:[],outcomes:{points:[],reported_litres:0,on_time_reported_litres:0,missing_point_names:['Unknown outcome'],issues:[]},limitations:['Not field evidence']};
const html=historyHtml(report);
assert.ok(html.includes('-100 L'));assert.ok(html.includes('Actual outcomes are unknown'));assert.ok(html.includes('map date unknown'));assert.ok(html.includes('Modelled travel distance'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('sha256'));assert.ok(!html.includes('JSON'));
const invalid=historyHtml({...report,comparison_ready:false,scheduled_difference_litres:null,original:{...report.original,valid:false,metrics:null,issues:['Capacity failed']}});
assert.ok(invalid.includes('comparison withheld'));assert.ok(invalid.includes('Capacity failed'));assert.ok(invalid.includes('Not available'));
const source=await readFile(new URL('../apps/web/src/App.tsx',import.meta.url),'utf8');
const navigation=await readFile(new URL('../apps/web/src/WorkspaceNav.tsx',import.meta.url),'utf8');
assert.ok(navigation.includes("real&&!cloud?[['History'"));assert.ok(source.includes('HistoricalComparison key={JSON.stringify(input)}'));

let busy=false,release;
const adapter=recordsApi({directory:'unused',hasPlanningJob:()=>busy,send:(res,status,body)=>{res.writeHead(status);res.end(JSON.stringify(body));},error:(res,status,code,message)=>{res.writeHead(status);res.end(JSON.stringify({error:{code,message}}));},run:async()=>{await new Promise(r=>{release=r;});return {report};}});
const server=http.createServer(async(req,res)=>{await adapter.handle(req,res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const post=()=>fetch(base+'/v1/records/history',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
try{
  busy=true;assert.equal((await post()).status,429);busy=false;
  const pending=post();while(!adapter.isBusy())await new Promise(r=>setTimeout(r,5));
  assert.equal((await post()).status,429);release();const result=await pending;assert.equal(result.status,200);assert.ok((await result.json()).report);assert.equal(adapter.isBusy(),false);
}finally{release?.();await new Promise(r=>server.close(r));}
console.log('Historical CSV, exact/blank outcomes, printable escaping/negative differences/withheld comparisons, local-only entry, stale-input remount and admission checks passed. Synthetic test records only.');
