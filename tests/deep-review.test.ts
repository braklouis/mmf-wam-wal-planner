import test from 'node:test';
import assert from 'node:assert/strict';
import { deepReview } from '../lib/deep-review.ts';
import { optimiseSubscription, type Portfolio, type Quote } from '../lib/planner.ts';
const portfolio:Portfolio={inputMode:'simple',tradeMode:'subscription',aum:100,ytm:2,wam:10,wal:10,transactionAmount:50,maxWam:60,maxWal:120};
const banks=[{id:'a',templateId:null,name:'A',limitPct:25,currentExposure:0}];
const quotes:Quote[]=[{id:'q',name:'Q',bankId:'a',wamDays:30,walDays:30,rate:5,cap:null}];
void test('independent review verifies an optimal allocation and detects altered totals and caps',()=>{
 const result=optimiseSubscription(portfolio,banks,quotes);assert.ok(result.ok);
 const report=deepReview({portfolio,banks,quotes,result});assert.ok(report.feasible);assert.ok(report.optimal);
 assert.equal(deepReview({portfolio,banks,quotes,result:{...result,postYtm:9}}).feasible,false);
 assert.equal(deepReview({portfolio,banks,quotes:[{...quotes[0],cap:1}],result}).feasible,false);
});
void test('feasible but suboptimal result does not receive an optimality pass',()=>{
 const result=optimiseSubscription(portfolio,banks,quotes);assert.ok(result.ok);
 const changed={...result,allocations:result.allocations.map(a=>({...a,amount:0})),postYtm:100/150*2,postWam:100/150*10,postWal:100/150*10,unallocated:50};
 const report=deepReview({portfolio,banks,quotes,result:changed});assert.ok(report.feasible);assert.equal(report.optimal,false);
});
void test('independent concentration reconstruction detects a tightened shared group',()=>{
 const p={...portfolio,inputMode:'holdings' as const,cashBufferAmount:0};
 const b=[{...banks[0],groupName:'G',groupLimitPct:20}];
 const result=optimiseSubscription(p,b,quotes);assert.ok(result.ok);
 assert.ok(deepReview({portfolio:p,banks:b,quotes,result}).optimal);
 assert.equal(deepReview({portfolio:p,banks:[{...b[0],groupLimitPct:1}],quotes,result}).feasible,false);
});

void test('75 quotes with two allocated products receive a certificate',()=>{
 const p={...portfolio,maxWam:20};
 const q:Quote[]=Array.from({length:75},(_,i)=>({id:String(i),name:String(i),bankId:'a',wamDays:i===0?10:60,walDays:i===0?10:60,rate:i===0?3:i===1?6:1,cap:null}));
 const result=optimiseSubscription(p,banks,q);assert.ok(result.ok);
 assert.equal(result.allocations.filter(a=>a.amount>0).length,2);
 const report=deepReview({portfolio:p,banks,quotes:q,result});
 assert.ok(report.feasible);assert.ok(report.optimal);assert.ok(report.attempts>0);
 // A better previously unallocated quote must invalidate the certificate,
 // even though the reported allocation remains feasible and unchanged.
 const improved=q.map((item,i)=>i===74?{...item,rate:20}:item);
 const changed=deepReview({portfolio:p,banks,quotes:improved,result});
 assert.ok(changed.feasible);assert.equal(changed.optimal,false);
});
