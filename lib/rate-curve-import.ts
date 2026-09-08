import { parseDelimitedTable, parseImportNumber } from './table-import.ts';
import { estimateTermRate, type RateNode } from './term-structure.ts';

export function parseRateCurve(text: string): RateNode[] {
  const rows = parseDelimitedTable(text);
  const header = rows[0]?.map(cell => cell.toLowerCase().replace(/\s/g, ''));
  const termAliases = ['期限', '期限(天)', '期限（天）', '天数', '天數', 'days', 'term', 'tenor'];
  const rateAliases = ['利率', '预测利率', '預測利率', '利率(%)', '利率（%）', 'rate', 'rate(%)', 'yield'];
  const termIndex = header?.findIndex(cell => termAliases.includes(cell)) ?? -1;
  const rateIndex = header?.findIndex(cell => rateAliases.includes(cell)) ?? -1;
  const hasHeader = termIndex >= 0 || rateIndex >= 0;
  if (hasHeader && (termIndex < 0 || rateIndex < 0)) throw new Error('请提供期限和利率两列。');
  const nodes = rows.slice(hasHeader ? 1 : 0).map((row, index) => {
    const term = row[hasHeader ? termIndex : 0]?.toUpperCase();
    const rateText = row[hasHeader ? rateIndex : 1] ?? '';
    const match = term?.match(/^(\d+(?:\.\d+)?)(D|W|M|Y|天|周|月|年)?$/);
    const scale: Record<string, number> = { D: 1, W: 7, M: 30, Y: 365, 天: 1, 周: 7, 月: 30, 年: 365 };
    const days = term === 'O/N' ? 1 : term === 'CASA' ? 0 : match ? Number(match[1]) * (scale[match[2]] ?? 1) : NaN;
    let rate = NaN;
    try { rate = parseImportNumber(rateText, true); } catch { /* Report the source row below. */ }
    if (!Number.isFinite(days) || !Number.isFinite(rate)) throw new Error(`第 ${index + (hasHeader ? 2 : 1)} 行：期限或利率格式无效。`);
    return { days, rate };
  });
  const valid = estimateTermRate(nodes, nodes[0]?.days ?? 0);
  if (!valid.ok) throw new Error(valid.message);
  return nodes.sort((a, b) => a.days - b.days);
}
