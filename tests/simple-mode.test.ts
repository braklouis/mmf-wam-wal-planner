import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePlan, optimiseSubscription, buildFrontier, solveTargetYtm, describeBindingConstraints, type Portfolio, type Quote } from '../lib/planner.ts';

const portfolio: Portfolio = { inputMode: 'simple', tradeMode: 'subscription', aum: 100, ytm: 2, wam: 10, wal: 10, transactionAmount: 50, maxWam: 60, maxWal: 120, redemptionStressPct: 5, cashBufferAmount: 10 };
const banks = [{ id: 'a', templateId: null, name: 'A', limitPct: 10, currentExposure: 100 }];
const quote: Quote = { id: 'q', name: 'Quote', bankId: 'a', wamDays: null, walDays: 30, rate: 5, cap: null };

void test('simple mode uses manual metrics and ignores holdings and concentration and cash stress', () => {
  const result = calculatePlan(portfolio, banks, [quote], []);
  assert.equal(result.ok, true);
  if (!result.ok || result.tradeMode !== 'subscription') return;
  assert.ok(Math.abs(result.allocations[0].amount - 50) < 1e-8);
  assert.ok(Math.abs(result.postYtm - 3) < 1e-8);
  assert.ok(Math.abs(result.postWam - 50 / 3) < 1e-8);
  assert.deepEqual(describeBindingConstraints(result, portfolio, [quote]), []);
  assert.equal(calculatePlan({ ...portfolio, inputMode: 'holdings' }, banks, [quote], []).ok, false);
});

void test('unlimited caps work in holdings mode without removing concentration limits', () => {
  const p = { ...portfolio, inputMode: 'holdings' as const, redemptionStressPct: 0 };
  const result = optimiseSubscription(p, [{ ...banks[0], currentExposure: 0 }], [quote]);
  assert.ok(result.ok);
  if (result.ok) assert.ok(Math.abs(result.allocations[0].amount - 15) < 1e-8);
});

void test('zero and finite quote caps remain binding; invalid caps are rejected', () => {
  for (const cap of [0, 12]) {
    const result = optimiseSubscription(portfolio, banks, [{ ...quote, cap }]);
    assert.ok(result.ok);
    if (result.ok) assert.ok(Math.abs((result.allocations[0]?.amount ?? 0) - cap) < 1e-8);
  }
  for (const cap of [-1, NaN, Infinity]) assert.equal(optimiseSubscription(portfolio, banks, [{ ...quote, cap }]).ok, false);
  assert.equal(optimiseSubscription({ ...portfolio, aum: NaN }, banks, [quote]).ok, false);
  const limited = optimiseSubscription({ ...portfolio, maxWam: 10 }, banks, [quote]);
  assert.ok(limited.ok);
  if (limited.ok) assert.ok(limited.postWam <= 10 + 1e-8 && limited.unallocated > 0);
});

void test('frontier and reverse target search support simple mode and unlimited quotes', () => {
  const points = buildFrontier('wam', portfolio, banks, [quote]);
  assert.ok(points.length > 0);
  assert.ok(points.every(p => Number.isFinite(p.ytm) && !p.bindingConstraints.some(c => c.includes('集中度') || c.includes('报价额度'))));
  const reverse = solveTargetYtm('wam', 3, portfolio, banks, [quote]);
  assert.ok(reverse.ok);
  if (reverse.ok) assert.ok(reverse.result.postYtm >= 3 - 1e-8);
});

void test('simple mode ignores inactive stress inputs in optimisation, frontier and reverse search', () => {
  const baseline = optimiseSubscription(portfolio, banks, [quote]);
  for (const stress of [15, NaN, Infinity, -1]) {
    const input = { ...portfolio, redemptionStressPct: stress, redemptionStressAmount: stress, cashBufferAmount: 0 };
    assert.deepEqual(optimiseSubscription(input, banks, [quote]), baseline);
    assert.ok(buildFrontier('wam', input, banks, [quote]).length > 0);
    assert.ok(solveTargetYtm('wam', 3, input, banks, [quote]).ok);
  }
});
