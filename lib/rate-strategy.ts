import { estimateTermRate, type RateNode } from './term-structure.ts';
import { optimiseSubscription, type Portfolio, type ModelBank, type Quote } from './planner.ts';

export type RateScenario = { nodes: { days: number | null; rate: number | null }[]; horizon: number | null; waitDays: number | null; basis: 360 | 365 };
export const emptyRateScenario = (): RateScenario => ({ nodes: [{ days: 1, rate: null }, { days: 30, rate: null }, { days: 60, rate: null }, { days: 90, rate: null }], horizon: 90, waitDays: 30, basis: 365 });

/** A single stationary forecast curve for one reinvestment at each initial maturity.
 * Percentage-point inputs, simple interest in each leg, principal and interest rolled.
 * This is a scenario payoff, never an executable quote or a portfolio YTM.
 */
export function projectedHoldingReturn(quote: Quote, nodes: readonly RateNode[], horizon: number, basis: number, waitDays = 30) {
  if (!Number.isFinite(horizon) || horizon <= 0 || ![360, 365].includes(basis)) throw new Error('请填写有效比较期限和计息基准。');
  if (!Number.isFinite(quote.walDays) || quote.walDays < 0 || quote.walDays > horizon) throw new Error('只支持比较日内到期的定期产品。');
  if (quote.wamDays !== null && quote.wamDays !== quote.walDays) throw new Error('暂不支持浮息产品的重定价预测。');
  if (!Number.isFinite(quote.rate)) throw new Error('当前报价格式无效。');
  const initialDays = quote.walDays === 0 ? waitDays : quote.walDays;
  if (!Number.isFinite(initialDays) || initialDays <= 0 || initialDays > horizon) throw new Error('等待天数须大于零且不超过比较期限。');
  const remaining = horizon - initialDays;
  const forecast = remaining === 0 ? null : estimateTermRate(nodes, remaining);
  if (forecast && !forecast.ok) throw new Error(forecast.message);
  const futureRate = forecast?.ok ? forecast.rate : null;
  const first = 1 + quote.rate / 100 * initialDays / basis;
  const second = 1 + (futureRate ?? 0) / 100 * remaining / basis;
  const gross = first * second;
  if (first <= 0 || second <= 0 || !Number.isFinite(gross)) throw new Error('利率或期限超出可计算范围。');
  return { initialDays, isWaiting: quote.walDays === 0, remaining, futureRate, returnRate: gross - 1, score: (gross - 1) * basis / horizon * 100 };
}

export function compareRateStrategies(portfolio: Portfolio, banks: ModelBank[], quotes: Quote[], scenario: RateScenario) {
  if (portfolio.tradeMode !== 'subscription') throw new Error('预测策略仅用于新增资金配置。');
  if (!(portfolio.transactionAmount > 0)) throw new Error('请先在配置测算填写大于零的可配置金额。');
  const nodes = scenario.nodes.map(node => {
    if (node.days === null || node.rate === null) throw new Error('请补齐每个预测节点的期限和利率，或删除空行。');
    return { days: node.days, rate: node.rate };
  });
  const validation = estimateTermRate(nodes, nodes[0]?.days ?? 0);
  if (!validation.ok) throw new Error(validation.message);
  const horizon = scenario.horizon ?? NaN;
  if (!Number.isFinite(horizon) || horizon <= 0) throw new Error('请填写有效比较期限和计息基准。');
  const included: Quote[] = [];
  const excluded: { name: string; reason: string }[] = [];
  const payoffs = new Map<string, ReturnType<typeof projectedHoldingReturn>>();
  for (const quote of quotes) {
    try {
      const payoff = projectedHoldingReturn(quote, nodes, horizon, scenario.basis, scenario.waitDays ?? NaN);
      included.push(quote);
      payoffs.set(quote.id, payoff);
    } catch (error) { excluded.push({ name: quote.name, reason: (error as Error).message }); }
  }
  if (!included.length) throw new Error('没有可比较产品：请检查今日报价、比较期限和预测曲线覆盖范围。');
  // Both optimizations use the same candidates and current constraints. Future
  // deposits are a payoff assumption, not a multi-period compliance certificate.
  const baseline = optimiseSubscription(portfolio, banks, included);
  const projected = optimiseSubscription(portfolio, banks, included.map(quote => ({ ...quote, rate: payoffs.get(quote.id)!.score })));
  if (!baseline.ok) throw new Error(baseline.messages.join('\n'));
  if (!projected.ok) throw new Error(projected.messages.join('\n'));
  const income = (allocations: { id: string; amount: number }[]) => allocations.reduce((sum, row) => sum + row.amount * payoffs.get(row.id)!.returnRate, 0);
  const baselineIncome = income(baseline.allocations);
  const projectedIncome = income(projected.allocations);
  if (!Number.isFinite(baselineIncome) || !Number.isFinite(projectedIncome)) throw new Error('预测收益超出可计算范围。');
  return { baseline, projected, baselineIncome, projectedIncome, excluded,
    rows: included.map(quote => ({ ...quote, ...payoffs.get(quote.id)!, baselineAmount: baseline.allocations.find(row => row.id === quote.id)?.amount ?? 0, projectedAmount: projected.allocations.find(row => row.id === quote.id)?.amount ?? 0 })) };
}
