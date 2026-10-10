import assert from 'node:assert/strict';
import { exampleStep } from '../apps/web/src/example-progress.ts';

assert.equal(exampleStep(false,false,false,false),0,'An untouched sample must ask for operating rules');
assert.equal(exampleStep(true,false,false,false),1,'Rules alone do not imply a checked plan');
assert.equal(exampleStep(true,true,false,false),2,'A checked plan is not an approval');
assert.equal(exampleStep(true,true,true,false),3,'Approval/loading do not imply delivered water');
assert.equal(exampleStep(true,true,true,true),4,'A positive reported delivery completes the practice path');
assert.equal(exampleStep(false,false,true,false),3,'Editing a new draft must not undo an existing approval');
console.log('Example guide progress checks passed: rules, plan, approval and delivery remain separate.');
