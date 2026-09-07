import assert from 'node:assert/strict';
import test from 'node:test';
import { canEditSummary, editSummary, resolvePortfolio, switchPortfolioMode, cashBufferPercentage } from '../lib/portfolio-input.ts';
import { type Portfolio, type Holding } from '../lib/planner.ts';
const input: Portfolio = { tradeMode:'subscription', aum:0, ytm:0, wam:0, wal:0, transactionAmount:20, maxWam:60, maxWal:120, redemptionStressPct:5 };
const holdings: Holding[] = [{ id:'h',name:'asset',bankId:null,amount:90,ytm:3,wamDays:20,walDays:40 },{id:'c',name:'cash',bankId:null,amount:10,ytm:1,isCash:true}];
void test('holdings mode derives every metric and ignores all legacy overrides', () => {
  const stale: Portfolio = { ...input, cashBufferPct:99, summaryOverrides:{aum:999,ytm:99,wam:99,wal:999,cashBufferAmount:99} };
  const p=resolvePortfolio(stale,holdings);
  assert.equal(p.aum,100); assert.ok(Math.abs(p.ytm-2.8)<1e-12); assert.equal(p.wam,18); assert.equal(p.wal,36); assert.equal(p.cashBufferAmount,10); assert.equal(cashBufferPercentage(p),10);
  for(const key of ['aum','ytm','wam','wal','cashBufferAmount','cashBufferPct'] as const) {
    assert.equal(canEditSummary('holdings',key),false);
    assert.equal(editSummary(stale,key,999),stale);
  }
  const changed=holdings.map(h=>h.id==='h'?{...h,amount:190}:h);
  const next=resolvePortfolio(stale,changed);
  assert.equal(next.aum,200); assert.equal(next.wam,19); assert.equal(next.wal,38); assert.equal(cashBufferPercentage(next),5);
});
void test('aggregate mode derives amounts and yield, accepts only manual total terms', () => {
  const rows=holdings.map(h=>({...h,wamDays:null,walDays:null}));
  let draft: Portfolio={...input,inputMode:'aggregate',aggregateWam:15,aggregateWal:25,summaryOverrides:{aum:500,ytm:8,cashBufferAmount:90}};
  const p=resolvePortfolio(draft,rows);
  assert.equal(p.aum,100); assert.ok(Math.abs(p.ytm-2.8)<1e-12); assert.equal(p.wam,15); assert.equal(p.wal,25); assert.equal(p.cashBufferAmount,10);
  draft=editSummary(draft,'wam',12); draft=editSummary(draft,'wal',24);
  assert.equal(resolvePortfolio(draft,rows).wam,12); assert.equal(resolvePortfolio(draft,rows).wal,24);
  assert.equal(editSummary(draft,'aum',500),draft);
  assert.ok(Number.isNaN(resolvePortfolio({...input,inputMode:'aggregate'},rows).wam));
});
void test('mode switches preserve separate manual drafts and never alter holdings', () => {
  const original=structuredClone(holdings);
  let draft=switchPortfolioMode(input,'simple',holdings);
  draft=editSummary(draft,'aum',200); draft=editSummary(draft,'wam',8); draft=editSummary(draft,'cashBufferPct',5);
  draft=switchPortfolioMode(draft,'aggregate',holdings);
  draft=editSummary(draft,'wam',12); draft=editSummary(draft,'wal',24);
  draft=switchPortfolioMode(draft,'holdings',holdings);
  assert.equal(resolvePortfolio(draft,holdings).aum,100); assert.equal(resolvePortfolio(draft,holdings).wam,18);
  draft=switchPortfolioMode(draft,'simple',holdings);
  assert.equal(resolvePortfolio(draft,holdings).aum,200); assert.equal(resolvePortfolio(draft,holdings).wam,8); assert.equal(resolvePortfolio(draft,holdings).cashBufferAmount,10);
  draft=switchPortfolioMode(draft,'aggregate',holdings);
  assert.equal(resolvePortfolio(draft,holdings).wam,12); assert.equal(resolvePortfolio(draft,holdings).wal,24);
  assert.deepEqual(holdings,original);
});
void test('simple buffer preserves last-edited basis without leaking into derived modes', () => {
  let draft=switchPortfolioMode(input,'simple',holdings);
  draft=editSummary(draft,'cashBufferPct',5); draft=editSummary(draft,'aum',200);
  assert.equal(resolvePortfolio(draft,holdings).cashBufferAmount,10);
  draft=editSummary(draft,'cashBufferAmount',7); draft=editSummary(draft,'aum',300);
  assert.equal(resolvePortfolio(draft,holdings).cashBufferAmount,7);
  assert.equal(resolvePortfolio(switchPortfolioMode(draft,'holdings',holdings),holdings).cashBufferAmount,10);
  draft=editSummary(draft,'cashBufferPct',101);
  assert.ok(Number.isNaN(resolvePortfolio(draft,holdings).cashBufferAmount));
});
void test('legacy aggregate manual terms migrate without importing wrong derived totals', () => {
  const old: Portfolio={...input,inputMode:'aggregate',aggregateWam:10,aggregateWal:20,summaryOverrides:{aum:999,wam:15,wal:30}};
  assert.equal(resolvePortfolio(old,holdings).wam,15);
  const back=switchPortfolioMode(switchPortfolioMode(old,'holdings',holdings),'aggregate',holdings);
  assert.equal(resolvePortfolio(back,holdings).wam,15); assert.equal(resolvePortfolio(back,holdings).aum,100);
});
