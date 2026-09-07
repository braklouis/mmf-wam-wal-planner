import { quoteWamDays, type Quote } from './planner.ts';

export type QuoteColumn = { key: string; label: string; wam: number; wal: number };
const terms = [['CASA', 0], ['O/N', 1], ['1W', 7], ['2W', 14], ['1M', 30], ['2M', 60], ['3M', 90], ['4M', 120], ['5M', 150], ['6M', 180], ['8M', 240], ['9M', 270]] as const;
export function quoteColumnKey(quote: Quote) {
  return `${quoteWamDays(quote)}/${quote.walDays}`;
}
export function quoteColumns(quotes: Quote[]): QuoteColumn[] {
  const columns: QuoteColumn[] = terms.map(([label, days]) => ({ key: `${days}/${days}`, label, wam: days, wal: days }));
  const keys = new Set(columns.map(column => column.key));
  for (const quote of quotes) {
    const key = quoteColumnKey(quote);
    if (keys.has(key)) continue;
    keys.add(key);
    const wam = quoteWamDays(quote);
    columns.push({ key, label: wam === quote.walDays ? `${quote.walDays}D` : `${wam}/${quote.walDays}D`, wam, wal: quote.walDays });
  }
  return columns;
}

export function updateExistingMatrixRate(quotes: Quote[], quoteId: string, rate: number | null): Quote[] {
  return rate === null ? quotes.filter(quote => quote.id !== quoteId) : quotes.map(quote => quote.id === quoteId ? { ...quote, rate } : quote);
}
