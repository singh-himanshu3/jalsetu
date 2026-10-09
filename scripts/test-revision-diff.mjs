import assert from 'node:assert/strict';
import {revisionDifference} from '../apps/web/src/revision-diff.ts';
const stop=(id,n)=>({site_id:id,planned_litres:n,estimated_arrival:'2026-10-10T09:00:00+05:30',estimated_departure:'2026-10-10T09:10:00+05:30'});
const rows=revisionDifference([{vehicle_id:'failed',stops:[stop('A',1000),stop('B',2000)]}],[{vehicle_id:'unused',stops:[stop('B',1500),stop('C',500)]}],{A:750});
assert.deepEqual(rows.map(({site_id,previous,delivered,pending,revised_total,delta})=>({site_id,previous,delivered,pending,revised_total,delta})),[
  {site_id:'A',previous:1000,delivered:750,pending:0,revised_total:750,delta:-250},
  {site_id:'B',previous:2000,delivered:0,pending:1500,revised_total:1500,delta:-500},
  {site_id:'C',previous:0,delivered:0,pending:500,revised_total:500,delta:500}]);
assert.equal(rows[1].next[0].vehicle_id,'unused');
assert.equal(revisionDifference([],[],{A:37})[0].delivered,37,'Physical reporting remainders are retained');
console.log('Revision difference preserves reported litres, removals, additions and reassignment.');
