import type { Portfolio, Holding } from './planner.ts';
import { holdingMetrics } from './holding-metrics.ts';
export const SUMMARY_FIELDS = ['aum', 'ytm', 'wam', 'wal', 'cashBufferAmount'] as const;
export type SummaryField = typeof SUMMARY_FIELDS[number];
export const MODE_LABELS = { simple: '简易模式', holdings: '持仓模式', aggregate: '汇总期限模式' } as const;
export type InputMode = keyof typeof MODE_LABELS;
export const MODE_DESCRIPTIONS = {
  holdings: '全部指标由持仓推导。',
  aggregate: '仅 WAM／WAL 手填，其余由持仓推导。',
  simple: '汇总指标手填，不校验集中度。',
} as const;
export function canEditSummary(mode: Portfolio['inputMode'], key: SummaryField | 'cashBufferPct') {
  return mode === 'simple' || mode === 'aggregate' && (key === 'wam' || key === 'wal');
}
function simpleInputs(input: Portfolio) {
  return input.simpleInputs ?? {
    aum: input.summaryOverrides?.aum ?? input.aum,
    ytm: input.summaryOverrides?.ytm ?? input.ytm,
    wam: input.summaryOverrides?.wam ?? input.wam,
    wal: input.summaryOverrides?.wal ?? input.wal,
    cashBufferAmount: input.summaryOverrides?.cashBufferAmount ?? input.cashBufferAmount ?? 0,
    cashBufferPct: input.cashBufferPct ?? null,
  };
}
export function resolvePortfolio(input: Portfolio, holdings: Holding[]): Portfolio {
  if (input.inputMode === 'simple') {
    const result = { ...input, ...simpleInputs(input) };
    if (result.cashBufferPct != null) {
      result.cashBufferAmount = Number.isFinite(result.cashBufferPct) && result.cashBufferPct >= 0 && result.cashBufferPct <= 100
        ? result.aum * (result.cashBufferPct / 100) : NaN;
    }
    return result;
  }
  const aggregate = input.inputMode === 'aggregate';
  const metrics = holdingMetrics(holdings, aggregate);
  return {
    ...input, aum: metrics.aum, ytm: metrics.ytm,
    // Old aggregate saves used overrides for the two manually entered terms.
    // No legacy override may replace a derived amount, yield or cash balance.
    wam: aggregate ? input.summaryOverrides?.wam ?? input.aggregateWam ?? NaN : metrics.wam,
    wal: aggregate ? input.summaryOverrides?.wal ?? input.aggregateWal ?? NaN : metrics.wal,
    cashBufferAmount: holdings.filter(h => h.isCash).reduce((sum,h) => sum+h.amount,0),
    cashBufferPct: null,
  };
}
export function editSummary(input: Portfolio, key: SummaryField | 'cashBufferPct', value: number): Portfolio {
  if (!canEditSummary(input.inputMode, key)) return input;
  if (input.inputMode === 'simple') return {
    ...input, simpleInputs: { ...simpleInputs(input), [key]: value, ...(key === 'cashBufferAmount' ? { cashBufferPct: null } : {}) },
  };
  return { ...input,
    aggregateWam: key === 'wam' ? value : input.summaryOverrides?.wam ?? input.aggregateWam,
    aggregateWal: key === 'wal' ? value : input.summaryOverrides?.wal ?? input.aggregateWal,
    summaryOverrides: undefined,
  };
}
export function switchPortfolioMode(input: Portfolio, mode: InputMode, holdings: Holding[]): Portfolio {
  const current = resolvePortfolio(input, holdings);
  const manual = input.simpleInputs ?? (input.inputMode === 'simple' ? simpleInputs(input) : undefined);
  return { ...input, inputMode: mode,
    simpleInputs: manual ?? (mode === 'simple' ? {
      aum: current.aum, ytm: current.ytm, wam: current.wam, wal: current.wal,
      cashBufferAmount: current.cashBufferAmount ?? 0, cashBufferPct: null,
    } : undefined),
    aggregateWam: (input.inputMode === 'aggregate' ? input.summaryOverrides?.wam : undefined) ?? input.aggregateWam ?? (mode === 'aggregate' ? current.wam : undefined),
    aggregateWal: (input.inputMode === 'aggregate' ? input.summaryOverrides?.wal : undefined) ?? input.aggregateWal ?? (mode === 'aggregate' ? current.wal : undefined),
    summaryOverrides: undefined,
  };
}
export function cashBufferPercentage(portfolio: Portfolio) {
  if (portfolio.cashBufferPct != null) return portfolio.cashBufferPct;
  const amount = portfolio.cashBufferAmount ?? 0;
  return portfolio.aum > 0 ? amount / portfolio.aum * 100 : portfolio.aum === 0 && amount === 0 ? 0 : NaN;
}
