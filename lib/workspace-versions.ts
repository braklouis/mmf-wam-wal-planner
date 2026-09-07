import { WORKSPACE_STORAGE_KEY, decodeWorkspace, encodeWorkspace, type WorkspaceSnapshot } from './workspace-save.ts';
export const VERSIONS_STORAGE_KEY = 'mmf-planner.workspace-versions.v1';
export type SavedVersion = { id: string; name: string; savedAt: string; data: string };
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
export function versionName(timestamp: string) {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function readVersions(storage: Pick<Storage, 'getItem'>): SavedVersion[] {
  const raw = storage.getItem(VERSIONS_STORAGE_KEY);
  if (raw !== null) {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.entries)) throw new Error('invalid versions');
    const ids = new Set<string>();
    for (const entry of value.entries) {
      if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || typeof entry.name !== 'string' || !entry.name.trim() || typeof entry.data !== 'string') throw new Error('invalid version');
      ids.add(entry.id);
      if (decodeWorkspace(entry.data).savedAt !== entry.savedAt) throw new Error('invalid timestamp');
    }
    return value.entries;
  }
  const legacy = storage.getItem(WORKSPACE_STORAGE_KEY);
  if (!legacy) return [];
  const snapshot = decodeWorkspace(legacy);
  return [{ id: `legacy-${snapshot.savedAt}`, name: versionName(snapshot.savedAt), savedAt: snapshot.savedAt, data: legacy }];
}
export function appendVersion(storage: StorageAccess, snapshot: WorkspaceSnapshot, id: string): SavedVersion[] {
  const previous = readVersions(storage);
  if (previous.some(entry => entry.id === id)) throw new Error('duplicate id');
  const next = [{ id, name: versionName(snapshot.savedAt), savedAt: snapshot.savedAt, data: encodeWorkspace(snapshot) }, ...previous];
  storage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify({ version: 1, entries: next }));
  return next;
}
export function renameVersion(storage: StorageAccess, id: string, name: string): SavedVersion[] {
  const previous = readVersions(storage);
  if (!name.trim() || !previous.some(entry => entry.id === id)) throw new Error('invalid name or id');
  const next = previous.map(entry => entry.id === id ? { ...entry, name: name.trim() } : entry);
  storage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify({ version: 1, entries: next }));
  return next;
}
export function deleteVersion(storage: StorageAccess, id: string): SavedVersion[] {
  const previous = readVersions(storage);
  if (!previous.some(entry => entry.id === id)) throw new Error('version not found');
  const next = previous.filter(entry => entry.id !== id);
  // Persist even an empty list so deleting the last version cannot resurrect the legacy save.
  storage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify({ version: 1, entries: next }));
  return next;
}

export const VERSION_MODES = ['simple', 'holdings', 'aggregate'] as const;
export function groupVersionsByMode(versions: SavedVersion[]) {
  return VERSION_MODES.map(mode => ({ mode, entries: versions.filter(version => (decodeWorkspace(version.data).portfolioInput.inputMode ?? 'holdings') === mode) }));
}
