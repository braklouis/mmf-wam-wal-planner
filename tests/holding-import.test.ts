import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDelimitedTable, parseImportNumber } from '../lib/table-import.ts';
import { detectHoldingColumns, parseHoldingRows } from '../lib/holding-import.ts';

void test('reordered Chinese columns and extra fields import with unit conversion', () => {
  const rows = parseDelimitedTable('\uFEFF备注\tYTM\t资产\t金额\r\n忽略\t3.5%\t示例资产\t1,000\r\n');
  assert.deepEqual(parseHoldingRows(rows, detectHoldingColumns(rows[0]), true, 1e-4), [{ name: '示例资产', amount: 0.1, ytm: 3.5 }]);
});
void test('CSV preserves quoted commas, quotes, and multiline names', () => {
  const rows = parseDelimitedTable('Asset,Amount,YTM\n"Bond, ""A""\nseries","1,234.50",0%');
  assert.deepEqual(parseHoldingRows(rows, detectHoldingColumns(rows[0]), true), [{ name: 'Bond, "A"\nseries', amount: 1234.5, ytm: 0 }]);
  assert.throws(() => parseDelimitedTable('"unclosed,3,4'));
  assert.throws(() => parseDelimitedTable('"asset"oops,3,4'));
});
void test('headerless mapping keeps repeated assets and negative yields', () => {
  assert.deepEqual(parseHoldingRows([['A', '0', '-0.5'], ['A', '1', '3.5％']], { name: 0, amount: 1, ytm: 2 }, false), [{ name: 'A', amount: 0, ytm: -0.5 }, { name: 'A', amount: 1, ytm: 3.5 }]);
});
void test('reject incomplete or invalid rows and ambiguous mappings atomically', () => {
  const columns = { name: 0, amount: 1, ytm: 2 };
  for (const row of [['A', '-1', '3'], ['A', '1,00', '3'], ['A', '1', ''], ['', '1', '3'], ['A', 'Infinity', '3'], ['A', '1', '3oops']]) {
    assert.throws(() => parseHoldingRows([['ok', '1', '3'], row], columns, false));
  }
  assert.throws(() => parseHoldingRows([['A', '1', '3']], { name: 0, amount: 0, ytm: 2 }, false));
  assert.equal(detectHoldingColumns(['资产', '名称', 'YTM']).name, -1);
  assert.throws(() => parseHoldingRows([['资产', '金额', 'YTM']], columns, true));
  assert.throws(() => parseHoldingRows([['A', '10', '3']], columns, false, Number.MAX_VALUE));
  assert.throws(() => parseImportNumber('1e4'));
});
