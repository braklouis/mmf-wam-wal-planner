import { parseImportNumber } from './table-import.ts';

export type HoldingColumnMap = { name: number; amount: number; ytm: number };
export const holdingImportFields = ['name', 'amount', 'ytm'] as const;
const aliases = {
  name: ['资产', '資產', '资产名称', '資產名稱', '产品', '產品', '资产/产品', '名称', '名稱', 'asset', 'name', 'product', 'security'],
  amount: ['金额', '金額', '持仓金额', '持倉金額', 'amount', 'marketvalue', '市值', 'balance'],
  ytm: ['ytm', 'ytm%', '收益率', '到期收益率', 'yield', 'yield%'],
};
export function detectHoldingColumns(header: string[]): HoldingColumnMap {
  const normalized = header.map(cell => cell.toLowerCase().replace(/[\s（）()]/g, ''));
  return Object.fromEntries(holdingImportFields.map(field => {
    const indices = normalized.flatMap((cell, index) => aliases[field].includes(cell) ? [index] : []);
    return [field, indices.length === 1 ? indices[0] : -1];
  })) as HoldingColumnMap;
}
export function parseHoldingRows(rows: string[][], columns: HoldingColumnMap, hasHeader: boolean, factor = 1) {
  if (holdingImportFields.some(field => !Number.isInteger(columns[field]) || columns[field] < 0)) throw new Error('请为资产、金额和 YTM 各选择一列。');
  if (new Set(Object.values(columns)).size !== 3) throw new Error('资产、金额和 YTM 不能使用同一列。');
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('金额单位无效。');
  const data = rows.slice(hasHeader ? 1 : 0).map((row, index) => {
    const line = index + (hasHeader ? 2 : 1);
    const name = row[columns.name]?.trim();
    if (!name) throw new Error(`第 ${line} 行：资产名称为空。`);
    let amount: number, ytm: number;
    try { amount = parseImportNumber(row[columns.amount] ?? '') * factor; }
    catch { throw new Error(`第 ${line} 行：金额格式无效。`); }
    if (!Number.isFinite(amount) || amount < 0) throw new Error(`第 ${line} 行：金额必须为非负有效数字。`);
    try { ytm = parseImportNumber(row[columns.ytm] ?? '', true); }
    catch { throw new Error(`第 ${line} 行：YTM 格式无效。`); }
    return { name, amount, ytm };
  });
  if (!data.length) throw new Error('请至少填写一项持仓。');
  if (!Number.isFinite(data.reduce((sum, row) => sum + row.amount, 0))) throw new Error('金额合计超出范围。');
  return data;
}
