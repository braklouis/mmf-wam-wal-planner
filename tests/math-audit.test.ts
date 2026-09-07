import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateInstitutionExposures, calculatePlan, calculateProRataRedemption, optimiseSubscription, buildFrontier, solveTargetYtm, type Portfolio, type ModelBank, type Quote } from '../lib/planner.ts';
const base: Portfolio = { tradeMode: 'subscription', aum: 100, ytm: 2, wam: 20, wal: 40, transactionAmount: 30, maxWam: 60, maxWal: 120 };
void test('manual portfolio terms reject WAM greater than WAL in every calculation path', () => {
  for (const inputMode of ['simple', 'aggregate', 'holdings'] as const) {
    const p = { ...base, inputMode, wam: 40, wal: 20 };
    assert.equal(optimiseSubscription(p, [], []).ok, false);
    assert.deepEqual(buildFrontier('wam', p, [], []), []);
    assert.equal(solveTargetYtm('wam', 1, p, [], []).ok, false);
    assert.equal(calculateProRataRedemption({ ...p, tradeMode: 'redemption' }, [], [{ id: 'h', name: 'h', bankId: null, amount: 100 }]).ok, false);
  }
});
void test('redemption enforces shared entity and group limits including final exposures', () => {
  const holdings = [{ id: 'a', name: 'a', bankId: 'a', amount: 12 }, { id: 'b', name: 'b', bankId: 'b', amount: 12 }, { id: 'c', name: 'c', bankId: null, amount: 76 }];
  const banks = aggregateInstitutionExposures(['a','b'].map(id => ({ id, name: id, templateId: null, limitPct: 25, groupName: 'G', groupLimitPct: 20 })), holdings);
  const p: Portfolio = { ...base, tradeMode: 'redemption', transactionAmount: 20 };
  assert.equal(calculatePlan(p, banks, [], holdings).ok, false);
  assert.equal(calculateProRataRedemption(p, banks.map(b => ({ ...b, currentExposure: 0 })), holdings).ok, false);
  assert.equal(calculatePlan(p, banks.map(b => ({ ...b, groupName: '', entityName: 'same', limitPct: 20 })), [], holdings).ok, false);
  const allowed = banks.map(b => ({ ...b, groupLimitPct: 25, groupLimitConfirmed: true }));
  const result = calculatePlan(p, allowed, [], holdings);
  assert.ok(result.ok);
  if (result.ok) { assert.equal(result.postWam, 20); assert.equal(result.postWal, 40); assert.equal(result.postYtm, 2); }
  assert.equal(calculatePlan(p, allowed.map((b,i) => ({ ...b, groupLimitPct: i ? 20 : 25 })), [], holdings).ok, false);
});

// Independent oracle: enumerate intersections of three constraint planes in currency
// units. It uses neither the production simplex nor its constraint-building helpers.
function vertexMaximum(rows: number[][], bounds: number[], rates: number[]) {
  const dot = (a: number[], b: number[]) => a.reduce((sum,x,i) => sum + x*b[i],0);
  const cross = (a: number[], b: number[]) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  let best = 0;
  for (let i=0;i<rows.length;i++) for(let j=i+1;j<rows.length;j++) for(let k=j+1;k<rows.length;k++) {
    const c1=cross(rows[j],rows[k]), c2=cross(rows[k],rows[i]), c3=cross(rows[i],rows[j]);
    const det=dot(rows[i],c1);
    if(Math.abs(det)<1e-10) continue;
    const x=[0,1,2].map(n=>(bounds[i]*c1[n]+bounds[j]*c2[n]+bounds[k]*c3[n])/det);
    if(rows.every((row,n)=>dot(row,x)<=bounds[n]+1e-7)) best=Math.max(best,dot(rates,x));
  }
  return best;
}
void test('300 seeded portfolios match independent vertex enumeration with cash, caps, floating rates and groups', () => {
  let seed=20260907;
  const random=()=> { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/2**32; };
  for(let trial=0;trial<300;trial++) {
    const simple=trial%3===0;
    const p: Portfolio={...base,inputMode:simple?'simple':trial%3===1?'aggregate':'holdings',transactionAmount:5+random()*95,wam:random()*15,wal:20+random()*20,maxWam:20+random()*40,maxWal:40+random()*80,cashBufferAmount:20,redemptionStressPct:random()*15};
    const banks: ModelBank[]=['a','b','c'].map((id,i)=>({id,name:id,templateId:null,limitPct:10+random()*15,currentExposure:random()*4,groupName:i<2?'G':'',groupLimitPct:20}));
    const quotes: Quote[]=banks.map((b,i)=>{ const wal=10+random()*260; return {id:String(i),bankId:b.id,name:b.id,wamDays:trial%2?wal*random():null,walDays:wal,rate:-1+random()*7,cap:trial%4===0?null:random()*60}; });
    const total=p.aum+p.transactionAmount;
    const rows=[[1,1,1],quotes.map(q=>q.wamDays??q.walDays),quotes.map(q=>q.walDays)];
    const bounds=[p.transactionAmount,total*p.maxWam!-p.aum*p.wam,total*p.maxWal!-p.aum*p.wal];
    for(let i=0;i<3;i++) {
      rows.push([0,1,2].map(j=>i===j?-1:0)); bounds.push(0);
      rows.push([0,1,2].map(j=>i===j?1:0)); bounds.push(quotes[i].cap??p.transactionAmount);
      if(!simple) { rows.push([0,1,2].map(j=>i===j?1:0)); bounds.push((total-p.aum*p.redemptionStressPct!/100)*banks[i].limitPct/100-banks[i].currentExposure); }
    }
    if(!simple) { rows.push([1,1,0]); bounds.push((total-p.aum*p.redemptionStressPct!/100)*.2-banks[0].currentExposure-banks[1].currentExposure); }
    const expected=vertexMaximum(rows,bounds,quotes.map(q=>q.rate));
    const result=optimiseSubscription(p,banks,quotes);
    assert.ok(result.ok, `trial ${trial}: ${JSON.stringify(result)}`);
    if(!result.ok) continue;
    const actual=result.allocations.reduce((sum,q)=>sum+q.amount*q.rate,0);
    assert.ok(Math.abs(actual-expected)<1e-6,`trial ${trial}: ${actual} != ${expected}`);
    assert.ok(Math.abs(result.postYtm-(p.aum*p.ytm+expected)/total)<1e-8);
    assert.ok(Math.abs(result.unallocated+result.allocations.reduce((sum,q)=>sum+q.amount,0)-p.transactionAmount)<1e-8);
  }
});
void test('target search and frontier match a closed-form single-product solution', () => {
  const p: Portfolio = { ...base, inputMode: 'simple', transactionAmount: 100 };
  const banks: ModelBank[] = [{ id: 'a', name: 'a', templateId: null, limitPct: 25, currentExposure: 0 }];
  const quotes: Quote[] = [{ id: 'q', name: 'q', bankId: 'a', wamDays: 80, walDays: 100, rate: 6, cap: null }];
  // Target 2.5% requires 50 invested: (100*2 + 50*6)/200 = 2.5.
  for (const [mode, limit] of [['wam',30],['wal',45]] as const) {
    const result=solveTargetYtm(mode,2.5,p,banks,quotes);
    assert.ok(result.ok);
    if(result.ok) { assert.equal(result.limit,limit); assert.ok(Math.abs(result.result.allocations[0].amount-50)<1e-6); }
    const points=buildFrontier(mode,p,banks,quotes);
    for(const point of points) {
      const capacity=mode==='wam'?(point.day*200-100*20)/80:(point.day*200-100*40)/100;
      // Other WAM limit is 60, which allows all 100; WAL limit is 120.
      const expected=(200+Math.max(0,Math.min(100,capacity))*6)/200;
      assert.ok(Math.abs(point.ytm-expected)<1e-7);
    }
  }
});
