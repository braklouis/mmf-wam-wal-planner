import assert from 'node:assert/strict';
import test from 'node:test';
import { quoteColumns, quoteColumnKey, updateExistingMatrixRate } from '../lib/quote-matrix.ts';
import { createLargeExample } from '../lib/large-example.ts';
import type { Quote } from '../lib/planner.ts';

void test('matrix supplies standard day conventions and retains every example quote', () => {
  const { quotes } = createLargeExample();
  const columns = quoteColumns(quotes);
  assert.deepEqual(columns.slice(0, 12).map(c => c.wal), [0, 1, 7, 14, 30, 60, 90, 120, 150, 180, 240, 270]);
  assert.equal(new Set(columns.map(c => c.key)).size, columns.length);
  for (const quote of quotes) assert.equal(columns.filter(c => c.key === quoteColumnKey(quote)).length, 1);
});

void test('fixed and floating quotes do not merge; repeated terms share a column without mutating quotes', () => {
  const fixed: Quote = { id: 'a', bankId: 'b', name: 'Fixed', walDays: 90, wamDays: null, cap: 12, rate: 3 };
  const floating: Quote = { ...fixed, id: 'b', name: 'Floating', wamDays: 30, cap: null };
  const quotes = [fixed, { ...fixed, id: 'c', rate: 4 }, floating];
  const before = structuredClone(quotes);
  const columns = quoteColumns(quotes);
  assert.notEqual(quoteColumnKey(fixed), quoteColumnKey(floating));
  assert.equal(columns.filter(c => c.key === '90/90').length, 1);
  assert.ok(columns.some(c => c.key === '30/90'));
  assert.deepEqual(quotes, before);
});

void test('clearing a matrix cell removes its quote while zero remains an investable rate', () => {
  const quote: Quote = { id: 'q', bankId: 'b', name: 'Deposit', walDays: 7, wamDays: null, cap: null, rate: 3 };
  assert.deepEqual(updateExistingMatrixRate([quote], 'q', null), []);
  assert.equal(updateExistingMatrixRate([quote], 'q', 0)[0].rate, 0);
  assert.equal(quote.rate, 3);
});
