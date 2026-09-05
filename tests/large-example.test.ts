import assert from 'node:assert/strict';
import test from 'node:test';
import { createLargeExample } from '../lib/large-example.ts';
import { aggregateInstitutionExposures, calculatePlan, buildFrontier } from '../lib/planner.ts';

void test('large portfolio reconciles redemption and preserves metrics across amount units', () => {
  for (const scale of [1, 100, 100_000_000]) {
    const e = createLargeExample('redemption');
    const p = { ...e.portfolio, aum: 480 * scale, transactionAmount: 48 * scale,
      cashBufferAmount: 60 * scale, redemptionStressAmount: 48 * scale };
    const holdings = e.holdings.map(h => ({ ...h, amount: h.amount * scale }));
    const banks = aggregateInstitutionExposures(e.banks, holdings);
    const result = calculatePlan(p, banks, e.quotes, holdings);
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(result.tradeMode, 'redemption');
    if (result.tradeMode !== 'redemption') return;
    assert.equal(result.holdings.length, 31);
    const redeemed = result.holdings.reduce((s, h) => s + h.redeemed, 0);
    const remaining = result.holdings.reduce((s, h) => s + h.finalAmount, 0);
    assert.ok(Math.abs(redeemed / scale - 48) < 1e-9);
    assert.ok(Math.abs(remaining / scale - 432) < 1e-9);
    assert.ok(Math.abs(result.postWal - p.wal) < 1e-9);
    assert.ok(Math.abs(result.postWam - p.wam) < 1e-9);
    assert.ok(Math.abs(result.postYtm - p.ytm) < 1e-9);
    result.banks.forEach(b => assert.ok(b.finalPct <= b.limitPct + 1e-9));
  }
});

void test('12-bank 30-product optimisation remains feasible and scale invariant', () => {
  let expectedYield: number | undefined;
  for (const scale of [1, 100, 100_000_000]) {
    const e = createLargeExample('subscription');
    const p = { ...e.portfolio, aum: 480 * scale, transactionAmount: 48 * scale,
      cashBufferAmount: 60 * scale, redemptionStressAmount: 48 * scale };
    const holdings = e.holdings.map(h => ({ ...h, amount: h.amount * scale }));
    const quotes = e.quotes.map(q => ({ ...q, cap: q.cap * scale }));
    const banks = aggregateInstitutionExposures(e.banks, holdings);
    const result = calculatePlan(p, banks, quotes, holdings);
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(result.tradeMode, 'subscription');
    if (result.tradeMode !== 'subscription') return;
    expectedYield ??= result.postYtm;
    assert.ok(Math.abs(result.postYtm - expectedYield) < 1e-9);
    assert.ok(result.postWam <= 60 + 1e-9);
    assert.ok(result.postWal <= 120 + 1e-9);
    assert.ok(Math.abs((result.allocations.reduce((s, q) => s + q.amount, 0) + result.unallocated) / scale - 48) < 1e-9);
    result.banks.forEach(b => assert.ok(b.stressedPct! <= b.limitPct + 1e-9));
    if (scale === 1) {
      for (const mode of ['wam', 'wal'] as const) {
        const points = buildFrontier(mode, p, banks, quotes);
        assert.ok(points.length > 0);
        points.forEach(point => assert.ok(Number.isFinite(point.ytm)));
      }
    }
  }
});
