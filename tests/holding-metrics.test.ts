import assert from 'node:assert/strict';
import test from 'node:test';
import { holdingMetrics } from '../lib/holding-metrics.ts';
import { initialHoldings } from '../lib/planner.ts';
import { createLargeExample } from '../lib/large-example.ts';

void test('holding metrics reconcile both examples', () => {
  const m = holdingMetrics(initialHoldings);
  assert.equal(m.aum, 100);
  assert.ok(Math.abs(m.ytm - 2.5) < 1e-12);
  assert.ok(Math.abs(m.wam - 30) < 1e-12);
  assert.ok(Math.abs(m.wal - 50) < 1e-12);
  const e = createLargeExample();
  const large = holdingMetrics(e.holdings);
  assert.ok(Math.abs(large.aum - 480) < 1e-9);
  assert.ok(Math.abs(large.ytm - e.portfolio.ytm) < 1e-9);
});

void test('weighted metrics include cash yield and use WAL when WAM is blank', () => {
  const rows = [
    { id: 'a', name: 'asset', bankId: null, amount: 80, ytm: 4, walDays: 30 },
    { id: 'c', name: 'cash', bankId: null, amount: 20, ytm: 1, isCash: true },
  ];
  const result = holdingMetrics(rows);
  assert.ok(Math.abs(result.ytm - 3.4) < 1e-12);
  assert.equal(result.wam, 24);
  assert.equal(result.wal, 24);
  assert.equal(result.aum, 100);
  assert.deepEqual(result.errors, []);
  assert.ok(Number.isNaN(holdingMetrics([{ ...rows[0], ytm: null }]).ytm));
  assert.ok(Number.isNaN(holdingMetrics([{ ...rows[0], wamDays: 40 }]).wam));
  assert.deepEqual(holdingMetrics([...rows, { id: 'z', name: 'empty', bankId: null, amount: 0 }]).errors, []);
});

void test('empty, invalid and extreme holdings do not produce spurious infinite yields', () => {
  assert.deepEqual(holdingMetrics([]), { aum: 0, ytm: 0, wam: 0, wal: 0, errors: [] });
  const row = { id: 'a', name: 'asset', bankId: null, amount: 1e307, ytm: 40, wamDays: 30, walDays: 90 };
  assert.equal(holdingMetrics([row, { ...row, id: 'b' }]).ytm, 40);
  assert.ok(Number.isNaN(holdingMetrics([{ ...row, amount: -1 }]).ytm));
  assert.ok(Number.isNaN(holdingMetrics([{ ...row, amount: Infinity }]).ytm));
  assert.ok(Number.isNaN(holdingMetrics([{ ...row, walDays: NaN }]).wal));
});
