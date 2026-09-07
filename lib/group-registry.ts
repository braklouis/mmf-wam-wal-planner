import type { BankTemplate } from './planner.ts';
import { concentrationKey, type ConcentrationMembership } from './concentration-groups.ts';
export type InstitutionGroup = { id: string; name: string; limitPct: number };
export const GROUP_STORAGE_KEY = 'mmf-planner.groups.v1';
export function groupsFromInstitutions(rows: ConcentrationMembership[]): InstitutionGroup[] {
  const groups = new Map<string, InstitutionGroup>();
  for (const row of rows) {
    const name = row.groupName?.trim();
    if (!name) continue;
    const key = concentrationKey(name);
    const previous = groups.get(key);
    groups.set(key, { id: `group-${key}`, name: previous?.name ?? name, limitPct: Math.min(previous?.limitPct ?? 25, row.groupLimitPct ?? 20) });
  }
  return [...groups.values()];
}
export function validGroups(value: unknown): value is InstitutionGroup[] {
  return Array.isArray(value) && value.every(g => g && typeof g.id === 'string' && typeof g.name === 'string' && g.name.trim() && typeof g.limitPct === 'number' && Number.isFinite(g.limitPct) && g.limitPct >= 0 && g.limitPct <= 25) && new Set(value.map(g => g.id)).size === value.length && new Set(value.map(g => concentrationKey(g.name))).size === value.length;
}
export function applyGroupRegistry<T extends ConcentrationMembership>(rows: T[], groups: InstitutionGroup[]): T[] {
  let changed = false;
  const result = rows.map(row => {
    const group = groups.find(g => concentrationKey(g.name) === concentrationKey(row.groupName ?? ''));
    const patch = { groupReviewRequired: false, ...(group ? { groupName: group.name, groupLimitPct: group.limitPct, groupLimitConfirmed: true } : {}) };
    if (Object.entries(patch).every(([key, value]) => row[key as keyof T] === value)) return row;
    changed = true;
    return { ...row, ...patch };
  });
  return changed ? result : rows;
}
export function renameGroupMembers(rows: BankTemplate[], from: string, to: string): BankTemplate[] {
  return rows.map(row => concentrationKey(row.groupName ?? '') === concentrationKey(from) ? { ...row, groupName: to } : row);
}
