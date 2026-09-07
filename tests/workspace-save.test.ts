import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeWorkspace, decodeWorkspace, type WorkspaceSnapshot } from '../lib/workspace-save.ts';
import { createLargeExample } from '../lib/large-example.ts';
const example = createLargeExample();
const snapshot: WorkspaceSnapshot = {
  version: 1, savedAt: '2026-09-07T09:00:00.000Z', portfolioInput: { ...example.portfolio, inputMode: 'simple', aum: NaN, maxWam: null },
  banks: example.banks, holdings: example.holdings, quotes: [{ ...example.quotes[0], cap: null, rate: 0 }], bankLibrary: [],
  amountUnit: '亿元', workspaceView: 'quotes', quoteView: 'matrix', quoteImportText: 'Bank\t1W', quoteImportOpen: false, quoteImportBankIds: [example.banks[0].id],
  manualMetrics: { aum: 100, wam: 41.64, wal: 61.1, ytm: NaN }, frontierMode: 'wal', targetYtm: 3.2,
  storedResult: { ok: false, tradeMode: 'subscription', postAum: NaN, messages: ['需要填写'] }, dirty: true,
  locale: 'zh-CN', theme: 'dark', newBankName: 'draft', newBankLimitPct: NaN, editingBankId: null, targetYtmError: null, targetYtmMessage: null,
};
void test('workspace round trip preserves blanks, unlimited caps, mode, rows, views and drafts', () => {
  assert.deepEqual(decodeWorkspace(encodeWorkspace(snapshot)), snapshot);
  assert.equal(decodeWorkspace(encodeWorkspace(snapshot)).quotes[0].cap, null);
  assert.ok(Number.isNaN(decodeWorkspace(encodeWorkspace(snapshot)).portfolioInput.aum));
});
void test('unsupported or damaged saves are rejected before restoration', () => {
  for (const raw of ['{', 'null', '{}', JSON.stringify({ ...snapshot, version: 2 }), encodeWorkspace({ ...snapshot, quotes: [{ ...snapshot.quotes[0], cap: 'bad' }] } as unknown as WorkspaceSnapshot)]) assert.throws(() => decodeWorkspace(raw));
});
void test('nonfinite numeric states remain distinct from nullable optional inputs', () => {
  const value = { ...snapshot, newBankLimitPct: Infinity, targetYtm: -Infinity };
  const decoded = decodeWorkspace(encodeWorkspace(value));
  assert.equal(decoded.newBankLimitPct, Infinity);
  assert.equal(decoded.targetYtm, -Infinity);
  assert.equal(decoded.portfolioInput.maxWam, null);
});
void test('versions preserve entity/group mappings, group caps and confirmation state', () => {
  const membership = { entityName: 'Bank A', groupName: 'Group A', groupLimitPct: 25, groupLimitConfirmed: true, groupReviewRequired: false };
  const value: WorkspaceSnapshot = { ...snapshot, banks: [{ ...snapshot.banks[0], ...membership }], bankLibrary: [{ id: 'template', name: 'Bank A', defaultLimitPct: 25, ...membership }] };
  assert.deepEqual(decodeWorkspace(encodeWorkspace(value)), value);
  assert.throws(() => decodeWorkspace(encodeWorkspace({ ...value, banks: [{ ...value.banks[0], groupName: 123 }] } as unknown as WorkspaceSnapshot)));
});
void test('versions retain independently created empty groups and reject duplicate group names', () => {
  const value = { ...snapshot, groups: [{ id: 'g', name: 'Empty group', limitPct: 20 }] };
  assert.deepEqual(decodeWorkspace(encodeWorkspace(value)), value);
  assert.throws(() => decodeWorkspace(encodeWorkspace({ ...value, groups: [...value.groups, { id: 'other', name: 'empty group', limitPct: 25 }] })));
});
