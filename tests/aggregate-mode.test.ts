import assert from 'node:assert/strict';
import test from 'node:test';
import { holdingMetrics } from '../lib/holding-metrics.ts';
import { calculatePlan, type Portfolio, type Holding } from '../lib/planner.ts';
const holdings: Holding[] = [{ id: 'h', name: 'Assets', bankId: null, amount: 100, ytm: 2 }];
void test('aggregate mode calculates AUM and weighted yield without per-holding terms', () => {
  const rows = [...holdings, { id: 'h2', name: 'Other', bankId: null, amount: 100, ytm: 4, wamDays: NaN, walDays: NaN }];
  const result = holdingMetrics(rows, true);
  assert.equal(result.aum, 200);
  assert.equal(result.ytm, 3);
  assert.deepEqual(result.errors, []);
  assert.ok(holdingMetrics(rows).errors.length > 0);
  assert.ok(holdingMetrics([{ ...holdings[0], ytm: null }], true).errors.length > 0);
});
void test('aggregate mode retains concentration caps while using manually entered portfolio terms', () => {
  const p: Portfolio = { inputMode: 'aggregate', tradeMode: 'subscription', aum: 100, ytm: 2, wam: 41.64, wal: 61.1, aggregateWam: 41.64, aggregateWal: 61.1, transactionAmount: 50, maxWam: 60, maxWal: 120 };
  const banks = [{ id: 'b', name: 'Bank', templateId: null, limitPct: 25, currentExposure: 0, entityName: 'Bank', groupName: 'Group', groupLimitPct: 20 }];
  const result = calculatePlan(p, banks, [{ id: 'q', name: 'Deposit', bankId: 'b', rate: 4, wamDays: null, walDays: 30, cap: null }], holdings);
  assert.ok(result.ok && result.tradeMode === 'subscription');
  if (!result.ok || result.tradeMode !== 'subscription') return;
  assert.ok(Math.abs(result.unallocated - 20) < 1e-8);
  assert.ok(Math.abs(result.postWam - (100 * 41.64 + 30 * 30) / 150) < 1e-8);
  assert.equal(calculatePlan({ ...p, wam: NaN }, banks, [], holdings).ok, false);
});
