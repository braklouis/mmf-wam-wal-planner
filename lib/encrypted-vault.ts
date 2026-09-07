// Only ciphertext is persisted. Decrypted records and the non-extractable key live in memory.
export const VAULT_KEY = 'mmf-planner.encrypted-vault.v1';
export const PRIVATE_KEYS = ['mmf-planner.bank-library.v1', 'mmf-planner.groups.v1', 'mmf-planner.workspace.v1', 'mmf-planner.workspace-versions.v1'] as const;
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Records = Record<string, string>;
const iterations = 600_000;
const vaultPassword = '20150102';
const aad = new TextEncoder().encode('mmf-planner.vault.v1');
const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
async function derive(salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(vaultPassword), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encrypt(key: CryptoKey, salt: string, records: Records) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, new TextEncoder().encode(JSON.stringify(records)));
  return JSON.stringify({ version: 1, kdf: 'PBKDF2-SHA256', iterations, salt, iv: encode(iv), data: encode(new Uint8Array(data)) });
}
async function decrypt(raw: string) {
  const envelope = JSON.parse(raw);
  if (envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== iterations) throw new Error('不支持的加密存档格式。');
  const salt = decode(envelope.salt);
  const iv = decode(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error('加密存档损坏。');
  const key = await derive(salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, decode(envelope.data));
  const records = JSON.parse(new TextDecoder().decode(plain));
  if (!records || typeof records !== 'object' || Array.isArray(records) || Object.entries(records).some(([name, value]) => !PRIVATE_KEYS.includes(name as typeof PRIVATE_KEYS[number]) || typeof value !== 'string')) throw new Error('加密存档损坏。');
  return { key, salt: envelope.salt as string, records: records as Records };
}
export class EncryptedVault {
  private queue: Promise<unknown> = Promise.resolve();
  private closed = false;
  private storage: Store;
  private key: CryptoKey | null;
  private salt: string;
  private records: Records;
  private raw: string;
  private pending = 0;
  get isSaving() { return this.pending > 0; }
  private constructor(storage: Store, key: CryptoKey, salt: string, records: Records, raw: string) {
    this.storage = storage; this.key = key; this.salt = salt; this.records = records; this.raw = raw;
  }
  static async open(storage: Store, create: boolean) {
    const existing = storage.getItem(VAULT_KEY);
    if (existing !== null) {
      if (create) throw new Error('保险库已存在，请重新打开页面并解锁。');
      const { key, salt, records } = await decrypt(existing);
      // Retry cleanup after an interrupted migration, only after successful decryption.
      for (const name of PRIVATE_KEYS) storage.removeItem(name);
      return new EncryptedVault(storage, key, salt, records, existing);
    }
    if (!create) throw new Error('找不到加密存档，请勿覆盖或重新初始化数据。');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await derive(salt);
    const records: Records = {};
    for (const name of PRIVATE_KEYS) {
      const value = storage.getItem(name);
      if (value !== null) records[name] = value;
    }
    const raw = await encrypt(key, encode(salt), records);
    await decrypt(raw);
    if (storage.getItem(VAULT_KEY) !== null) throw new Error('另一页面已创建保险库，请刷新后解锁。');
    storage.setItem(VAULT_KEY, raw);
    if (storage.getItem(VAULT_KEY) !== raw) throw new Error('加密保存验证失败，旧数据未删除。');
    for (const name of PRIVATE_KEYS) storage.removeItem(name);
    return new EncryptedVault(storage, key, encode(salt), records, raw);
  }
  getItem(name: string) {
    if (this.closed) throw new Error('保险库已锁定。');
    return this.records[name] ?? null;
  }
  transaction<T>(update: (storage: Pick<Storage, 'getItem' | 'setItem'>) => T): Promise<T> {
    const run = async () => {
      if (this.closed || !this.key) throw new Error('保险库已锁定。');
      if (this.storage.getItem(VAULT_KEY) !== this.raw) throw new Error('存档已在另一页面更改，请锁定并重新解锁后再保存。');
      const next = { ...this.records };
      const result = update({ getItem: name => next[name] ?? null, setItem: (name, value) => {
        if (!PRIVATE_KEYS.includes(name as typeof PRIVATE_KEYS[number])) throw new Error('未知数据类型。');
        next[name] = value;
      } });
      if (JSON.stringify(next) === JSON.stringify(this.records)) return result;
      const raw = await encrypt(this.key, this.salt, next);
      if (this.closed) throw new Error('保险库已锁定。');
      if (this.storage.getItem(VAULT_KEY) !== this.raw) throw new Error('存档已在另一页面更改，请重新解锁。');
      this.storage.setItem(VAULT_KEY, raw);
      this.raw = raw;
      this.records = next;
      return result;
    };
    this.pending += 1;
    const task = this.queue.then(async () => {
      try {
        return await (typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(VAULT_KEY, run) : run());
      } finally { this.pending -= 1; }
    });
    this.queue = task.catch(() => {});
    return task;
  }
  close() { this.closed = true; this.key = null; this.records = {}; }
}
