import type { Bank, BankTemplate } from './planner.ts';

// Older imports did not store template IDs, so link those by normalized name.
export function syncBankLimits(banks: Bank[], library: BankTemplate[]): Bank[] {
  const normalize = (name: string) => name.trim().toLocaleLowerCase('zh-CN');
  let changed = false;
  const next = banks.map(bank => {
    const template = bank.templateId
      ? library.find(entry => entry.id === bank.templateId)
      : library.find(entry => normalize(entry.name) === normalize(bank.name));
    if (!template || (['entityName', 'groupName', 'groupLimitPct', 'groupLimitConfirmed', 'groupReviewRequired'].every(key => bank[key as keyof Bank] === template[key as keyof BankTemplate]) && bank.name === template.name && bank.templateId === template.id && Object.is(bank.limitPct, template.defaultLimitPct))) return bank;
    changed = true;
    return { ...bank, name: template.name, templateId: template.id, limitPct: template.defaultLimitPct, entityName: template.entityName, groupName: template.groupName, groupLimitPct: template.groupLimitPct, groupLimitConfirmed: template.groupLimitConfirmed, groupReviewRequired: template.groupReviewRequired };
  });
  return changed ? next : banks;
}
