import { validGroups, type InstitutionGroup } from './group-registry.ts';
import { validConcentrationMembership } from './concentration-groups.ts';
import type { Portfolio, Bank, Holding, Quote, BankTemplate, AmountUnit, WorkspaceView, ModelResult, FrontierMode } from './planner.ts';
import type { Locale, Theme } from './i18n.ts';
export const WORKSPACE_STORAGE_KEY = 'mmf-planner.workspace.v1';
export type WorkspaceSnapshot = {
  version: 1; savedAt: string; portfolioInput: Portfolio; banks: Bank[]; holdings: Holding[]; quotes: Quote[];
  groups?: InstitutionGroup[]; bankLibrary: BankTemplate[]; amountUnit: AmountUnit; workspaceView: WorkspaceView; quoteView: 'matrix' | 'details';
  quoteImportText: string; quoteImportOpen: boolean; quoteImportBankIds: string[] | null;
  manualMetrics: Pick<Portfolio, 'aum' | 'ytm' | 'wam' | 'wal'> | null;
  frontierMode: FrontierMode; targetYtm: number | null; storedResult: ModelResult; dirty: boolean;
  locale: Locale; theme: Theme; newBankName: string; newBankLimitPct: number; editingBankId: string | null;
  targetYtmError: string | null; targetYtmMessage: string | null;
};
export function encodeWorkspace(value: WorkspaceSnapshot) {
  return JSON.stringify(value, (_key, v) => typeof v === 'number' && !Number.isFinite(v) ? { $number: String(v) } : v);
}
export function decodeWorkspace(raw: string): WorkspaceSnapshot {
  const v = JSON.parse(raw, (_key, value) => {
    if (value && typeof value === 'object' && Object.keys(value).length === 1 && '$number' in value) {
      if (!['NaN', 'Infinity', '-Infinity'].includes(value.$number)) throw new Error('invalid number');
      return Number(value.$number);
    }
    return value;
  });
  const object = (x: unknown) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const fields = (x: Record<string, unknown>, keys: string[], type: string) => keys.every(key => typeof x[key] === type);
  const rows = (x: unknown, strings: string[], numbers: string[]) => Array.isArray(x) && x.every(row => object(row) && fields(row, strings, 'string') && fields(row, numbers, 'number')) && new Set(x.map(row => row.id)).size === x.length;
  if (!object(v) || v.version !== 1 || typeof v.savedAt !== 'string' || !Number.isFinite(Date.parse(v.savedAt)) ||
      (v.groups !== undefined && !validGroups(v.groups)) ||
      !object(v.portfolioInput) || !fields(v.portfolioInput, ['aum', 'ytm', 'wam', 'wal', 'transactionAmount'], 'number') ||
      !['subscription', 'redemption'].includes(v.portfolioInput.tradeMode) ||
      ![undefined, 'simple', 'holdings', 'aggregate'].includes(v.portfolioInput.inputMode) ||
      !(v.portfolioInput.simpleInputs === undefined || object(v.portfolioInput.simpleInputs) && fields(v.portfolioInput.simpleInputs, ['aum', 'ytm', 'wam', 'wal', 'cashBufferAmount'], 'number') && (v.portfolioInput.simpleInputs.cashBufferPct === null || typeof v.portfolioInput.simpleInputs.cashBufferPct === 'number')) ||
      !(v.portfolioInput.summaryOverrides === undefined || object(v.portfolioInput.summaryOverrides) && Object.entries(v.portfolioInput.summaryOverrides).every(([key, value]) => ['aum', 'ytm', 'wam', 'wal', 'cashBufferAmount'].includes(key) && typeof value === 'number')) ||
      !(v.portfolioInput.cashBufferPct == null || typeof v.portfolioInput.cashBufferPct === 'number') ||
      !['aggregateWam', 'aggregateWal'].every(key => v.portfolioInput[key] === undefined || typeof v.portfolioInput[key] === 'number') ||
      !['maxWam', 'maxWal'].every(key => v.portfolioInput[key] === null || typeof v.portfolioInput[key] === 'number') ||
      !rows(v.banks, ['id', 'name'], ['limitPct']) || !rows(v.holdings, ['id', 'name'], ['amount']) ||
      !rows(v.quotes, ['id', 'name', 'bankId'], ['rate', 'walDays']) || !v.quotes.every((q: Quote) => (q.cap === null || typeof q.cap === 'number') && (q.wamDays === null || typeof q.wamDays === 'number')) ||
      !rows(v.bankLibrary, ['id', 'name'], ['defaultLimitPct']) || !v.banks.every(validConcentrationMembership) || !v.bankLibrary.every(validConcentrationMembership) ||
      !['元', '万元', '百万元', '亿元'].includes(v.amountUnit) || !['planner', 'holdings', 'quotes', 'institutions', 'versions'].includes(v.workspaceView) ||
      !['matrix', 'details'].includes(v.quoteView) || !['wam', 'wal'].includes(v.frontierMode) ||
      !['zh-CN', 'zh-HK', 'en'].includes(v.locale) || !['light', 'dark'].includes(v.theme) ||
      typeof v.dirty !== 'boolean' || typeof v.quoteImportText !== 'string' || typeof v.quoteImportOpen !== 'boolean' ||
      !(v.quoteImportBankIds === null || Array.isArray(v.quoteImportBankIds) && v.quoteImportBankIds.every((id: unknown) => typeof id === 'string')) ||
      !(v.manualMetrics === null || object(v.manualMetrics) && fields(v.manualMetrics, ['aum', 'ytm', 'wam', 'wal'], 'number')) ||
      !object(v.storedResult) || typeof v.storedResult.ok !== 'boolean' ||
      (v.storedResult.ok ? !Array.isArray(v.storedResult.banks) || !(Array.isArray(v.storedResult.allocations) || Array.isArray(v.storedResult.holdings)) : !Array.isArray(v.storedResult.messages)) ||
      !(v.targetYtm === null || typeof v.targetYtm === 'number') || typeof v.newBankName !== 'string' || typeof v.newBankLimitPct !== 'number' ||
      !['editingBankId', 'targetYtmError', 'targetYtmMessage'].every(key => v[key] === null || typeof v[key] === 'string')) throw new Error('invalid workspace');
  return v as WorkspaceSnapshot;
}
