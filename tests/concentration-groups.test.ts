import assert from 'node:assert/strict';
import test from 'node:test';
import { optimiseSubscription, describeBindingConstraints, buildFrontier, solveTargetYtm, type ModelBank, type Portfolio, type Quote } from '../lib/planner.ts';
const portfolio: Portfolio = { tradeMode: 'subscription', aum: 100, ytm: 2, wam: 0, wal: 0, transactionAmount: 50, maxWam: 60, maxWal: 120, redemptionStressPct: 0 };
const banks: ModelBank[] = ['a', 'b'].map(id => ({ id, templateId: id, name: id, limitPct: 25, currentExposure: 0, entityName: id, groupName: 'G', groupLimitPct: 20, groupReviewRequired: false }));
const quotes: Quote[] = banks.map((bank, index) => ({ id: bank.id, bankId: bank.id, name: bank.name, wamDays: null, walDays: 30, rate: 4 - index, cap: null }));
void test('group cap aggregates existing exposure and all new quotes; binding constraints explain limit', () => {
  const result = optimiseSubscription(portfolio, banks.map(b => ({ ...b, currentExposure: 5 })), quotes);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.ok(Math.abs(result.allocations.reduce((sum, q) => sum + q.amount, 0) - 20) < 1e-8);
  assert.ok(describeBindingConstraints(result, portfolio, quotes).some(c => c.includes('G集团')));
});
void test('CASA and fixed deposits for one entity share the stricter entity cap', () => {
  const result = optimiseSubscription(portfolio, banks.map(b => ({ ...b, entityName: 'same', limitPct: 10 })), quotes);
  assert.ok(result.ok);
  if (result.ok) assert.ok(Math.abs(result.unallocated - 35) < 1e-8);
});
void test('group breaches and inconsistent limits fail closed', () => {
  for (const modified of [
    banks.map(b => ({ ...b, currentExposure: 16 })),
    banks.map(b => ({ ...b, groupLimitPct: 25 })),
    banks.map((b, i) => ({ ...b, groupLimitPct: i ? 15 : 20 })),
    banks.map((b, i) => ({ ...b, entityName: 'same', groupName: i ? 'other' : 'G' })),
  ]) assert.equal(optimiseSubscription(portfolio, modified, quotes).ok, false);
  const confirmed = optimiseSubscription(portfolio, banks.map(b => ({ ...b, groupLimitPct: 25, groupLimitConfirmed: true })), quotes);
  assert.ok(confirmed.ok);
  if (confirmed.ok) assert.ok(Math.abs(confirmed.unallocated - 12.5) < 1e-8);
});
void test('simple mode retains its explicit opt-out; frontier and reverse search inherit group limits', () => {
  const simple = optimiseSubscription({ ...portfolio, inputMode: 'simple' }, banks.map(b => ({ ...b, groupReviewRequired: true })), quotes);
  assert.ok(simple.ok);
  if (simple.ok) assert.ok(simple.unallocated < 1e-8);
  const points = buildFrontier('wam', portfolio, banks, quotes);
  assert.ok(points.length > 0);
  assert.ok(points.every(p => p.unallocated >= 20 - 1e-8));
  assert.equal(solveTargetYtm('wam', 3, portfolio, banks, quotes).ok, false);
});
void test('same entity cannot avoid group accounting by leaving one alias ungrouped', () => {
  const result = optimiseSubscription(portfolio, banks.map((b, i) => ({ ...b, entityName: 'same', groupName: i ? '' : 'G' })), quotes);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.messages.some(m => m.includes('不同集团')));
});
