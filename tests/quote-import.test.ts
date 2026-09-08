import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuoteTable } from '../lib/quote-import.ts';
void test('table import keeps blank banks, zero rates and percentages; ignores Max', () => {
  const data = parseQuoteTable('Bank\tCASA\t1W\t9M\nA\t\t2.68%\t3.78%\nB\t0%\t\t\nB\t\t\t\nMax\t0%\t2.68%\t3.78%');
  assert.deepEqual(data.banks, ['A', 'B']);
  assert.deepEqual(data.quotes, [{ bank: 'A', term: '1W', days: 7, rate: 2.68 }, { bank: 'A', term: '9M', days: 270, rate: 3.78 }, { bank: 'B', term: 'CASA', days: 0, rate: 0 }]);
});
void test('bad cells, ambiguous columns and duplicate rates fail instead of importing partially', () => {
  for (const text of ['Bank\t1M\nA\tbad', 'Bank\t1M\t1M\nA\t1\t2', 'Bank\t10M\nA\t2', 'Bank\t1W\nA\t2\nA\t3']) assert.throws(() => parseQuoteTable(text));
});
void test('CSV and localized bank headers support case-insensitive terms', () => {
  assert.deepEqual(parseQuoteTable('\uFEFF银行,1m,o/n\nA,3.5％,0').quotes, [
    { bank: 'A', term: '1M', days: 30, rate: 3.5 },
    { bank: 'A', term: 'O/N', days: 1, rate: 0 },
  ]);
});
void test('empty rates and unnamed banks cannot silently replace existing quotes', () => {
  for (const text of ['Bank\t1M\nA\t', 'Bank\t1M\n\t3', 'Bank\t1m\t1M\nA\t2\t3']) assert.throws(() => parseQuoteTable(text));
});
