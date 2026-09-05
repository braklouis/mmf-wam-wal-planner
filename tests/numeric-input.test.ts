import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeNumericInput } from '../lib/numeric-input.ts';

void test('pasted thousands separators cannot silently change amount scale', () => {
  assert.equal(normalizeNumericInput('1,000'), '1000');
  assert.equal(normalizeNumericInput(' 1，234，567.89 '), '1234567.89');
  assert.equal(normalizeNumericInput('-1,234.5'), '-1234.5');
  for (const input of ['1,5', '12,34', '1.234,56', 'Infinity', 'NaN', '1e309']) {
    assert.equal(normalizeNumericInput(input), null);
  }
  for (const draft of ['', '-', '.', '-.', '12.', '.5', '-0.25']) {
    assert.equal(normalizeNumericInput(draft), draft);
  }
});
