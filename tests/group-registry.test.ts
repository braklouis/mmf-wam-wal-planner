import assert from 'node:assert/strict';
import test from 'node:test';
import { groupsFromInstitutions, validGroups, applyGroupRegistry, renameGroupMembers } from '../lib/group-registry.ts';
void test('legacy groups migrate once; independent groups need no member institution', () => {
  const groups = groupsFromInstitutions([{ groupName: 'G', groupLimitPct: 25 }, { groupName: 'g', groupLimitPct: 20 }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].limitPct, 20);
  assert.ok(validGroups([...groups, { id: 'empty', name: 'New', limitPct: 25 }]));
  assert.equal(validGroups([...groups, { id: 'duplicate', name: ' g ', limitPct: 20 }]), false);
});
void test('manual group settings synchronize and renaming keeps entity membership', () => {
  const rows = [{ id: 'a', name: 'A', defaultLimitPct: 25, groupName: 'G', groupReviewRequired: true }];
  const updated = applyGroupRegistry(rows, [{ id: 'g', name: 'G', limitPct: 25 }]);
  assert.equal(updated[0].groupReviewRequired, false);
  assert.equal((updated[0] as {groupLimitPct?:number}).groupLimitPct, 25);
  assert.equal(applyGroupRegistry(updated, [{ id: 'g', name: 'G', limitPct: 25 }]), updated);
  assert.equal(renameGroupMembers(updated, 'g', 'Renamed')[0].groupName, 'Renamed');
});
