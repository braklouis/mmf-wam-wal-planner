import type { ModelBank } from './planner.ts';

export type ConcentrationMembership = {
  entityName?: string;
  groupName?: string;
  groupLimitPct?: number;
  groupLimitConfirmed?: boolean;
  groupReviewRequired?: boolean;
};
export const concentrationKey = (name: string) => name.trim().toLocaleLowerCase('zh-CN');

export function concentrationBuckets(banks: ModelBank[]) {
  const buckets = new Map<string, { name: string; kind: 'entity' | 'group'; bankIds: string[]; currentExposure: number; limitPct: number }>();
  for (const bank of banks) {
    for (const kind of ['entity', 'group'] as const) {
      const name = (kind === 'entity' ? bank.entityName?.trim() || bank.name : bank.groupName)?.trim();
      if (!name) continue;
      const key = `${kind}:${concentrationKey(name)}`;
      const limitPct = kind === 'entity' ? bank.limitPct : bank.groupLimitPct ?? 20;
      const bucket = buckets.get(key) ?? { name, kind, bankIds: [], currentExposure: 0, limitPct };
      bucket.bankIds.push(bank.id);
      bucket.currentExposure += bank.currentExposure;
      bucket.limitPct = Math.min(bucket.limitPct, limitPct);
      buckets.set(key, bucket);
    }
  }
  return [...buckets.values()];
}

export function concentrationMembershipErrors(banks: ModelBank[], _activeIds: Set<string>) {
  const errors: string[] = [];
  const groups = new Map<string, number>();
  const entities = new Map<string, string>();
  for (const bank of banks) {
    const key = concentrationKey(bank.groupName ?? '');
    const entity = concentrationKey(bank.entityName?.trim() || bank.name);
    if (entities.has(entity) && entities.get(entity) !== key) errors.push(`${bank.entityName || bank.name}被归入不同集团，请统一归属。`);
    entities.set(entity, key);
    if (!key) continue;
    const limit = bank.groupLimitPct ?? 20;
    if (!Number.isFinite(limit) || limit < 0 || limit > 25) errors.push(`${bank.groupName}集团上限须为 0 至 25%。`);
    if (limit > 20 && !bank.groupLimitConfirmed) errors.push(`${bank.groupName}超过一般集团上限 20%，请确认适用条件。`);
    if (groups.has(key) && groups.get(key) !== limit) errors.push(`${bank.groupName}的集团上限不一致，请在机构管理中统一。`);
    groups.set(key, limit);
  }
  return [...new Set(errors)];
}

export function validConcentrationMembership(value: ConcentrationMembership) {
  return ['entityName', 'groupName'].every(key => value[key as 'entityName' | 'groupName'] === undefined || typeof value[key as 'entityName' | 'groupName'] === 'string') &&
    (value.groupLimitPct === undefined || typeof value.groupLimitPct === 'number') &&
    (value.groupLimitConfirmed === undefined || typeof value.groupLimitConfirmed === 'boolean') &&
    (value.groupReviewRequired === undefined || typeof value.groupReviewRequired === 'boolean');
}
