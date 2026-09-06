import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFrontier,
  optimiseSubscription,
  redemptionStress,
  solveTargetYtm,
  type Portfolio,
} from '../lib/planner.ts';

const base: Portfolio = {
  tradeMode: 'subscription',
  aum: 100,
  transactionAmount: 20,
  ytm: 2,
  wam: 20,
  wal: 30,
  maxWam: 60,
  maxWal: 120,
  cashBufferAmount: 5,
  redemptionStressPct: 2,
};

void test('an empty portfolio accepts zero stress entered as an amount', () => {
  const portfolio = {
    ...base,
    aum: 0,
    ytm: 0,
    wam: 0,
    wal: 0,
    cashBufferAmount: 0,
    redemptionStressAmount: 0,
  };
  assert.equal(redemptionStress(portfolio).error, null);
  assert.equal(redemptionStress(portfolio).pct, 0);
  assert.ok(optimiseSubscription(portfolio, [], []).ok);
  for (const amount of [-1, 1, NaN, Infinity]) {
    assert.ok(
      redemptionStress({ ...portfolio, redemptionStressAmount: amount }).error,
    );
  }
});

void test('reverse search rounds an already sufficient minimum upward and recalculates', () => {
  for (const mode of ['wam', 'wal'] as const) {
    const portfolio = { ...base, wal: 31 };
    const solution = solveTargetYtm(mode, 1, portfolio, [], []);
    assert.ok(solution.ok);
    if (!solution.ok) return;
    const exact = (portfolio.aum / 120) * portfolio[mode];
    const expected = Math.ceil(exact * 100) / 100;
    assert.equal(solution.limit, expected);
    assert.equal(
      mode === 'wam'
        ? solution.result.appliedMaxWam
        : solution.result.appliedMaxWal,
      expected,
    );
    assert.ok(solution.result.postYtm >= 1);
  }
});

void test('large finite amounts preserve stress, allocation, frontier and reverse results', () => {
  const bank = {
    id: 'bank',
    templateId: null,
    name: 'Bank',
    limitPct: 25,
    currentExposure: 0,
  };
  const quote = {
    id: 'quote',
    bankId: 'bank',
    name: 'Quote',
    wamDays: 20,
    walDays: 30,
    rate: 3,
    cap: 20,
  };
  const reference = optimiseSubscription(base, [bank], [quote]);
  assert.ok(reference.ok);
  for (const scale of [1e306, 1e-6]) {
    const portfolio = {
      ...base,
      aum: base.aum * scale,
      transactionAmount: 20 * scale,
      cashBufferAmount: 5 * scale,
    };
    const quotes = [{ ...quote, cap: 20 * scale }];
    const result = optimiseSubscription(portfolio, [bank], quotes);
    assert.ok(result.ok);
    if (!result.ok || !reference.ok) return;
    assert.ok(Math.abs(result.postYtm - reference.postYtm) < 1e-10);
    assert.ok(
      Math.abs(redemptionStress(portfolio).redemption / scale - 2) < 1e-10,
    );
    for (const mode of ['wam', 'wal'] as const) {
      const frontier = buildFrontier(mode, portfolio, [bank], quotes);
      assert.ok(frontier.length > 0);
      const solution = solveTargetYtm(mode, 2, portfolio, [bank], quotes);
      const expected = solveTargetYtm(mode, 2, base, [bank], [quote]);
      assert.ok(solution.ok && expected.ok);
      if (solution.ok && expected.ok)
        assert.equal(solution.limit, expected.limit);
    }
  }
});
