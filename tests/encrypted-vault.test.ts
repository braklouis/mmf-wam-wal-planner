import test from 'node:test';
import assert from 'node:assert/strict';
import { EncryptedVault, PRIVATE_KEYS, VAULT_KEY } from '../lib/encrypted-vault.ts';
function store() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
void test('migrates every private record, persists ciphertext only, unlocks and locks', async () => {
  const storage = store();
  for (const key of PRIVATE_KEYS) storage.setItem(key, `private secret: ${key}`);
  storage.setItem('mmf-planner.locale.v1', 'zh-CN');
  const vault = await EncryptedVault.open(storage, true);
  for (const key of PRIVATE_KEYS) {
    assert.equal(storage.getItem(key), null);
    assert.equal(vault.getItem(key), `private secret: ${key}`);
  }
  assert.equal(storage.getItem('mmf-planner.locale.v1'), 'zh-CN');
  assert.ok(!storage.getItem(VAULT_KEY)!.includes('private secret'));
  assert.ok(!storage.getItem(VAULT_KEY)!.includes('20150102'));
  const reopened = await EncryptedVault.open(storage, false);
  assert.equal(reopened.getItem(PRIVATE_KEYS[0]), vault.getItem(PRIVATE_KEYS[0]));
  vault.close();
  assert.throws(() => vault.getItem(PRIVATE_KEYS[0]));
  await assert.rejects(vault.transaction(s => s.setItem(PRIVATE_KEYS[0], 'bad')));
});
void test('tampering cannot unlock or modify ciphertext', async () => {
  const storage = store();
  await EncryptedVault.open(storage, true);
  const before = storage.getItem(VAULT_KEY)!;
  const modified = JSON.parse(before);
  modified.data = (modified.data[0] === 'A' ? 'B' : 'A') + modified.data.slice(1);
  storage.setItem(VAULT_KEY, JSON.stringify(modified));
  await assert.rejects(EncryptedVault.open(storage, false));
});
void test('failed migration preserves original plaintext', async () => {
  const storage = store();
  storage.setItem(PRIVATE_KEYS[0], 'original');
  const full = { ...storage, setItem: () => { throw new Error('quota'); } };
  await assert.rejects(EncryptedVault.open(full, true));
  assert.equal(storage.getItem(PRIVATE_KEYS[0]), 'original');
  assert.equal(storage.getItem(VAULT_KEY), null);
});
void test('serializes updates, uses fresh IVs, rejects stale sessions and rolls back failed writes', async () => {
  const storage = store();
  const vault = await EncryptedVault.open(storage, true);
  const stale = await EncryptedVault.open(storage, false);
  const initial = JSON.parse(storage.getItem(VAULT_KEY)!);
  await Promise.all(PRIVATE_KEYS.map(key => vault.transaction(s => s.setItem(key, key))));
  assert.notEqual(JSON.parse(storage.getItem(VAULT_KEY)!).iv, initial.iv);
  await assert.rejects(stale.transaction(s => s.setItem(PRIVATE_KEYS[0], 'stale')));
  const reopened = await EncryptedVault.open(storage, false);
  for (const key of PRIVATE_KEYS) assert.equal(reopened.getItem(key), key);
  const originalSet = storage.setItem;
  storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(vault.transaction(s => s.setItem(PRIVATE_KEYS[0], 'lost')));
  assert.equal(vault.getItem(PRIVATE_KEYS[0]), PRIVATE_KEYS[0]);
  storage.setItem = originalSet;
  await vault.transaction(s => s.setItem(PRIVATE_KEYS[0], 'retry'));
  assert.equal((await EncryptedVault.open(storage, false)).getItem(PRIVATE_KEYS[0]), 'retry');
});
void test('interrupted cleanup can be resumed after unlock; existing vault cannot be overwritten by setup', async () => {
  const storage = store();
  storage.setItem(PRIVATE_KEYS[0], 'original');
  const broken = { ...storage, removeItem: () => { throw new Error('interrupted'); } };
  await assert.rejects(EncryptedVault.open(broken, true));
  assert.notEqual(storage.getItem(VAULT_KEY), null);
  await assert.rejects(EncryptedVault.open(storage, true));
  const reopened = await EncryptedVault.open(storage, false);
  assert.equal(reopened.getItem(PRIVATE_KEYS[0]), 'original');
  assert.equal(storage.getItem(PRIVATE_KEYS[0]), null);
});
