import assert from 'node:assert/strict';
import {routePoints, directionsParts, legDirections, navigateTo, driverBlock} from '../apps/web/src/driver-route.ts';

const sites = Array.from({length:20},(_,i)=>({site_id:`p${i}`,name:`Point ${i+1}`,location:{latitude:28.7+i/1000,longitude:77.2+i/1000}}));
const input = {depot:{name:'Depot',location:{latitude:28.6,longitude:77.1}},sites};
const route = n=>({vehicle_id:'v1',planned_load_litres:2000,stops:sites.slice(0,n).map(s=>({site_id:s.site_id,planned_litres:100,estimated_arrival:'2026-10-10T04:00:00Z',estimated_departure:'2026-10-10T04:10:00Z'}))});
for (const count of [1,3,4,5,8,20]) {
  const points=routePoints(input,route(count));
  assert.equal(points.length,count+2);
  const segments=directionsParts(points);
  const decoded=[];
  for (const [i,segment] of segments.entries()) {
    const u=new URL(segment.url);
    assert.equal(u.origin,'https://www.google.com');
    assert.equal(u.searchParams.get('api'),'1');
    assert.equal(u.searchParams.get('travelmode'),'driving');
    const coords=[u.searchParams.get('origin'),...(u.searchParams.get('waypoints')?.split('|')??[]),u.searchParams.get('destination')];
    assert.ok(coords.length<=5,'Never exceed three mobile-browser intermediate waypoints');
    assert.ok(segment.url.length<=2048);
    if (i) assert.equal(decoded.at(-1),coords[0],'Segments must join without skipping a boundary');
    decoded.push(...coords.slice(i?1:0));
  }
  assert.deepEqual(decoded,points.map(p=>`${p.latitude},${p.longitude}`),'Every stop must retain order and end back at depot');
  for(let i=1;i<points.length;i++){
    const u=new URL(legDirections(points,i));
    assert.equal(u.searchParams.get('origin'),`${points[i-1].latitude},${points[i-1].longitude}`);
    assert.equal(u.searchParams.get('destination'),`${points[i].latitude},${points[i].longitude}`);
  }
  const current=new URL(navigateTo(points[1]));
  assert.equal(current.searchParams.has('origin'),false,'Use driver device location, not a fictional current position');
  assert.equal(current.searchParams.get('dir_action'),'navigate');
}
for(const value of [null,NaN,Infinity,91,'28.7']) assert.equal(routePoints({...input,depot:{location:{latitude:value,longitude:77}}},route(1)),null);
assert.equal(routePoints({...input,sites:[]},route(1)),null);
assert.equal(routePoints(input,route(0)),null);
assert.equal(routePoints({...input,sites:[{...sites[0],location:{latitude:28,longitude:181}}]},route(1)),null);
assert.match(driverBlock(route(1),{v1:{failed:true,trip_completed:false,loaded:true}},[]),/failed/);
assert.match(driverBlock(route(1),{v1:{failed:false,trip_completed:true,loaded:true}},[]),/complete/);
assert.match(driverBlock(route(1),{},['p0']),/closed/);
assert.equal(driverBlock(route(1),{},['p19']),'');
console.log('Driver directions checks passed: all 1-20 stops retained in order, phone-safe segments, depot return, current-location navigation, invalid-coordinate rejection and disrupted-route blocks.');
