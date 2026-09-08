import { parseDelimitedTable, parseImportNumber } from './table-import.ts';

export function parseQuoteTable(text: string) {
  const rows = parseDelimitedTable(text);
  const days: Record<string, number> = { CASA: 0, 'O/N': 1, '1W': 7, '2W': 14, '1M': 30, '2M': 60, '3M': 90, '4M': 120, '5M': 150, '6M': 180, '8M': 240, '9M': 270 };
  const header = rows.shift()?.map(cell => cell.toUpperCase());
  if (!header || !['BANK', '银行', '銀行', '机构', '機構'].includes(header[0]) || header.slice(1).some(term => days[term] === undefined) || header.length < 2 || new Set(header).size !== header.length) throw new Error('请粘贴含 Bank 和期限表头的制表符分隔报价表。');
  const names = new Set<string>();
  const quotes: { bank: string; term: string; days: number; rate: number }[] = [];
  const cells = new Set<string>();
  for (const row of rows) {
    const bank = row[0];
    if (!bank) throw new Error('存在缺少机构名称的报价行。');
    if (bank.toLowerCase() === 'max') continue;
    names.add(bank);
    for (let index = 1; index < row.length; index++) {
      if (!row[index]) continue;
      const term = header[index];
      if (!term) throw new Error(`${bank}：报价超出表头列数。`);
      let rate: number;
      try { rate = parseImportNumber(row[index], true); } catch { throw new Error(`${bank} ${term}：报价格式无效。`); }
      if (!Number.isFinite(rate)) throw new Error(`${bank}：报价必须为有效数字。`);
      const key = `${bank}\t${term}`;
      if (cells.has(key)) throw new Error(`${bank} ${term}：存在重复报价。`);
      cells.add(key);
      quotes.push({ bank, term, days: days[term], rate });
    }
  }
  if (!quotes.length) throw new Error('请至少填写一条有效报价，空表不会替换今日报价。');
  if (!names.size) throw new Error('请至少填写一家银行。');
  return { banks: [...names], quotes };
}
