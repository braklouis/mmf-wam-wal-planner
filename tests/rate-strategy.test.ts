import assert from 'node:assert/strict';
import test from 'node:test';
import { compareRateStrategies, projectedHoldingReturn } from '../lib/rate-strategy.ts';
import { parseRateCurve } from '../lib/rate-curve-import.ts';
import type { Portfolio, Quote } from '../lib/planner.ts';
const portfolio: Portfolio = { inputMode: 'simple', tradeMode: 'subscription', aum: 0, ytm: 0, wam: 0, wal: 0, transactionAmount: 100, maxWam: 60, maxWal: 60 };
const banks = [{ id: 'a', name: 'A', templateId: null, limitPct: 10, currentExposure: 0 }];
const quote = (id: string, days: number, rate: number): Quote => ({ id, name: id, bankId: 'a', wamDays: null, walDays: days, rate, cap: null });
const quotes = [quote('lock', 60, 3), quote('short', 30, 2), quote('cash', 0, 1)];
const scenario = (rate: number) => ({ horizon: 60, waitDays: 10, basis: 365 as const, nodes: [{ days: 1, rate }, { days: 60, rate }] });
void test('rising forecasts favor cash waiting and falling forecasts favor locking', () => {
  const rising = compareRateStrategies(portfolio, banks, quotes, scenario(5));
  assert.ok(rising.rows.find(row => row.id === 'cash')!.projectedAmount > 99.99);
  assert.ok(rising.rows.find(row => row.id === 'lock')!.baselineAmount > 99.99);
  assert.ok(rising.projectedIncome > rising.baselineIncome);
  const falling = compareRateStrategies(portfolio, banks, quotes, scenario(1));
  assert.ok(falling.rows.find(row => row.id === 'lock')!.projectedAmount > 99.99);
  assert.equal(quotes[0].rate, 3);
});
void test('cash waiting earns current cash interest and rolls principal plus interest', () => {
  const payoff = projectedHoldingReturn(quotes[2], scenario(5).nodes, 60, 365, 10);
  assert.ok(Math.abs(payoff.returnRate - ((1 + 0.01 * 10 / 365) * (1 + 0.05 * 50 / 365) - 1)) < 1e-12);
  const direct = projectedHoldingReturn(quotes[0], [], 60, 360);
  assert.ok(Math.abs(direct.returnRate - 0.005) < 1e-12);
});
void test('initial concentration and quote caps remain binding under forecast objective', () => {
  const limited = compareRateStrategies({ ...portfolio, inputMode: 'holdings' }, banks, quotes.map(q => ({ ...q, cap: 4 })), scenario(5));
  assert.ok(limited.projected.allocations.every(row => row.amount <= 4 + 1e-8));
  assert.ok(limited.projected.allocations.reduce((sum, row) => sum + row.amount, 0) <= 10 + 1e-8);
});
void test('no extrapolation or repricing guesses; missing and invalid forecasts fail', () => {
  const r = compareRateStrategies(portfolio, banks, [...quotes, { ...quote('floating', 60, 3), wamDays: 1 }, quote('long', 90, 4)], { ...scenario(5), nodes: [{ days: 30, rate: 5 }] });
  assert.ok(r.excluded.some(row => row.name === 'cash'));
  assert.ok(r.excluded.some(row => row.name === 'floating'));
  assert.ok(r.excluded.some(row => row.name === 'long'));
  assert.throws(() => compareRateStrategies(portfolio, banks, quotes, { ...scenario(5), nodes: [{ days: 30, rate: null }] }));
  assert.throws(() => compareRateStrategies(portfolio, banks, quotes, { ...scenario(5), horizon: 0 }));
  assert.throws(() => projectedHoldingReturn(quotes[2], scenario(5).nodes, 60, 365, -1));
});
void test('curve import handles reordered headers and tenor aliases and rejects duplicates', () => {
  assert.deepEqual(parseRateCurve('利率\t期限\n3%\t1M\n4\t1W'), [{ days: 7, rate: 4 }, { days: 30, rate: 3 }]);
  assert.deepEqual(parseRateCurve('30,3.5\n60,4'), [{ days: 30, rate: 3.5 }, { days: 60, rate: 4 }]);
  assert.throws(() => parseRateCurve('期限\t利率\n1M\t3\n30\t4'));
  assert.throws(() => parseRateCurve('期限\t利率\nwhat\t3'));
});
