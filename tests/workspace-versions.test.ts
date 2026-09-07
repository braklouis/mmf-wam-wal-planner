import assert from 'node:assert/strict';
import test from 'node:test';
import { appendVersion, readVersions, renameVersion, deleteVersion, VERSIONS_STORAGE_KEY } from '../lib/workspace-versions.ts';
import { WORKSPACE_STORAGE_KEY, encodeWorkspace, decodeWorkspace, type WorkspaceSnapshot } from '../lib/workspace-save.ts';
const snapshot: WorkspaceSnapshot = {
  version: 1, savedAt: '2026-09-07T09:00:00.000Z', portfolioInput: { tradeMode: 'subscription', inputMode: 'simple', aum: NaN, ytm: 0, wam: 41.64, wal: 61.1, transactionAmount: 0, maxWam: null, maxWal: null },
  banks: [], holdings: [], quotes: [], bankLibrary: [], amountUnit: '亿元', workspaceView: 'versions', quoteView: 'matrix', quoteImportText: '', quoteImportOpen: false, quoteImportBankIds: null,
  manualMetrics: null, frontierMode: 'wam', targetYtm: null, storedResult: { ok: false, tradeMode: 'subscription', postAum: NaN, messages: [] }, dirty: true, locale: 'zh-CN', theme: 'light', newBankName: '', newBankLimitPct: 10, editingBankId: null, targetYtmError: null, targetYtmMessage: null,
};
function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
void test('legacy save is migrated once without deletion when a new version is appended', () => {
  const s = storage(); const legacy = encodeWorkspace(snapshot); s.setItem(WORKSPACE_STORAGE_KEY, legacy);
  assert.equal(readVersions(s).length, 1);
  appendVersion(s, { ...snapshot, savedAt: '2026-09-07T10:00:00.000Z' }, 'new');
  assert.equal(readVersions(s).length, 2);
  assert.equal(s.getItem(WORKSPACE_STORAGE_KEY), legacy);
  appendVersion(s, snapshot, 'newer');
  assert.equal(readVersions(s).length, 3);
});
void test('identical timestamps remain distinct; naming does not change captured content', () => {
  const s = storage(); appendVersion(s, snapshot, 'a'); appendVersion(s, snapshot, 'b');
  renameVersion(s, 'a', '  Friday plan  ');
  const versions = readVersions(s);
  assert.equal(versions.length, 2);
  assert.equal(versions.find(v => v.id === 'a')?.name, 'Friday plan');
  assert.deepEqual(decodeWorkspace(versions[1].data), snapshot);
  assert.throws(() => renameVersion(s, 'a', '   '));
  assert.throws(() => appendVersion(s, snapshot, 'a'));
});
void test('failed writes and corrupted stores never replace existing versions', () => {
  const s = storage(); appendVersion(s, snapshot, 'a'); const original = s.getItem(VERSIONS_STORAGE_KEY);
  assert.throws(() => appendVersion({ ...s, setItem: () => { throw new Error('quota'); } }, snapshot, 'b'));
  assert.equal(s.getItem(VERSIONS_STORAGE_KEY), original);
  s.setItem(VERSIONS_STORAGE_KEY, '{broken');
  assert.throws(() => appendVersion(s, snapshot, 'b'));
  assert.equal(s.getItem(VERSIONS_STORAGE_KEY), '{broken');
});

void test('deleting one version preserves others, and deleting the last cannot revive the legacy save', () => {
  const s = storage(); s.setItem(WORKSPACE_STORAGE_KEY, encodeWorkspace(snapshot));
  const entries = appendVersion(s, snapshot, 'new');
  const legacy = entries[1];
  deleteVersion(s, 'new');
  assert.deepEqual(readVersions(s), [legacy]);
  deleteVersion(s, legacy.id);
  assert.deepEqual(readVersions(s), []);
  assert.throws(() => deleteVersion(s, legacy.id));
});
void test('failed deletion writes preserve the original version list', () => {
  const s = storage(); appendVersion(s, snapshot, 'a');
  const before = s.getItem(VERSIONS_STORAGE_KEY);
  assert.throws(() => deleteVersion({ ...s, setItem: () => { throw new Error('unavailable'); } }, 'a'));
  assert.equal(s.getItem(VERSIONS_STORAGE_KEY), before);
});
