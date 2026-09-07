import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateTermRate } from '../lib/term-structure.ts';
void test('observed nodes and linear interpolation retain percentage-point units', () => {
  const nodes=[{days:90,rate:3.2},{days:30,rate:2.4}];
  const result=estimateTermRate(nodes,60);
  assert.ok(result.ok);
  if(result.ok) { assert.ok(Math.abs(result.rate-2.8)<1e-12); assert.equal(result.method,'linear'); assert.deepEqual(result.bracket,[30,90]); }
  assert.deepEqual(estimateTermRate(nodes,30),{ok:true,days:30,rate:2.4,method:'observed',bracket:[30,30]});
  assert.equal(nodes[0].days,90);
});
void test('flat, inverted and negative rate curves are valid', () => {
  for(const [a,b,expected] of [[3,3,3],[4,2,3],[-2,0,-1]]) {
    const r=estimateTermRate([{days:0,rate:a},{days:10,rate:b}],5);
    assert.ok(r.ok); if(r.ok) assert.equal(r.rate,expected);
  }
});
void test('rejects duplicate and invalid nodes and refuses extrapolation', () => {
  for(const nodes of [[],[{days:1,rate:2},{days:1,rate:3}],[{days:-1,rate:2}],[{days:1,rate:NaN}],[{days:Infinity,rate:2}]]) assert.equal(estimateTermRate(nodes,5).ok,false);
  const nodes=[{days:30,rate:2},{days:90,rate:3}];
  for(const day of [-1,NaN,Infinity,0,100]) assert.equal(estimateTermRate(nodes,day).ok,false);
  assert.equal(estimateTermRate([nodes[0]],30).ok,true);
  assert.equal(estimateTermRate([nodes[0]],31).ok,false);
});
