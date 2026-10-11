import assert from 'node:assert/strict';
import { exampleStep } from '../apps/web/src/example-progress.ts';

assert.equal(exampleStep(false,false,false,false),0,'An untouched sample must ask for operating rules');
assert.equal(exampleStep(true,false,false,false),1,'Rules alone do not imply a checked plan');
assert.equal(exampleStep(true,true,false,false),2,'A checked plan is not an approval');
assert.equal(exampleStep(true,true,true,false),3,'Approval/loading do not imply delivered water');
assert.equal(exampleStep(true,true,true,true),4,'A delivery report advances to disruption practice, not completion');
assert.equal(exampleStep(false,false,true,false),3,'Editing a new draft must not undo an existing approval');
assert.equal(exampleStep(true,true,true,true,true,false),4,'A breakdown alone is not a revised plan');
assert.equal(exampleStep(true,true,true,true,false,true),4,'A review without disruption does not finish disruption practice');
assert.equal(exampleStep(true,true,true,true,true,true),5,'A deliberately reviewed revision after disruption completes practice');
assert.equal(exampleStep(true,true,true,false,true,true),3,'A reviewed revision does not substitute for tracking a delivery');
console.log('Example guide progress checks passed: rules, plan, approval and delivery remain separate.');
