import test from 'node:test';
import assert from 'node:assert/strict';
import { syncBankLimits } from '../lib/bank-limits.ts';

void test('library limits override legacy imported limits and follow the linked institution after rename', () => {
  const original = [{ id: 'bank', templateId: null, name: ' ABC ', limitPct: 10 }];
  const linked = syncBankLimits(original, [{ id: 'template', name: 'abc', defaultLimitPct: 25 }]);
  assert.equal(linked[0].limitPct, 25);
  assert.equal(linked[0].templateId, 'template');
  const updated = syncBankLimits(linked, [{ id: 'template', name: 'Renamed', defaultLimitPct: 15 }]);
  assert.equal(updated[0].limitPct, 15);
  assert.equal(updated[0].name, 'Renamed');
  assert.equal(updated[0].id, 'bank');
  assert.equal(original[0].limitPct, 10);
  assert.equal(syncBankLimits(updated, []), updated);
  assert.equal(syncBankLimits(updated, [{ id: 'template', name: 'Renamed', defaultLimitPct: 15 }]), updated);
});
