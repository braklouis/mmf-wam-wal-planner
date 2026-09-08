/** Experimental quote-rate interpolation, not a discount/zero/forward curve.
 * Nodes must share currency, valuation date and annualisation convention.
 * Rates use percentage points: 2.5 means 2.5%. Used by the independent forecast scenario.
 */
export type RateNode = { days: number; rate: number };
export type RateEstimate =
  | { ok: true; days: number; rate: number; method: 'observed' | 'linear'; bracket: [number, number] }
  | { ok: false; reason: 'invalid-nodes' | 'invalid-term' | 'outside-range'; message: string };
export function estimateTermRate(nodes: readonly RateNode[], days: number): RateEstimate {
  if (!Number.isFinite(days) || days < 0) return { ok: false, reason: 'invalid-term', message: '期限须为非负有限数值。' };
  if (!nodes.length || nodes.some(node => !Number.isFinite(node.days) || node.days < 0 || !Number.isFinite(node.rate)) || new Set(nodes.map(node => node.days)).size !== nodes.length) {
    return { ok: false, reason: 'invalid-nodes', message: '请提供有效且期限不重复的利率节点。' };
  }
  const ordered = [...nodes].sort((a,b) => a.days-b.days);
  const exact = ordered.find(node => node.days === days);
  if (exact) return { ok: true, days, rate: exact.rate, method: 'observed', bracket: [days,days] };
  const upper = ordered.findIndex(node => node.days > days);
  if (upper <= 0) return { ok: false, reason: 'outside-range', message: '目标期限不在输入区间内，不作外推。' };
  const left = ordered[upper-1], right = ordered[upper];
  const weight = (days-left.days)/(right.days-left.days);
  // Weighted form avoids overflowing the difference between extreme rates.
  const rate = (1-weight)*left.rate + weight*right.rate;
  if (!Number.isFinite(rate)) return { ok: false, reason: 'invalid-nodes', message: '数值超出可计算范围。' };
  return { ok: true, days, rate, method: 'linear', bracket: [left.days,right.days] };
}
