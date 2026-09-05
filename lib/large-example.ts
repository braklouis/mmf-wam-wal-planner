import type { Bank, Holding, Portfolio, Quote, TradeMode } from './planner.ts';

/** Real bank names, synthetic single-currency amounts in 亿元 and illustrative quotes. */
export function createLargeExample(tradeMode: TradeMode = 'subscription') {
  let seed = 20260905;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const names = [
    '汇丰银行（香港）', '恒生银行（香港）', '中银香港', '东亚银行（香港）',
    '星展银行（新加坡）', '华侨银行（新加坡）', '大华银行（新加坡）', '渣打银行（新加坡）',
    'Saudi National Bank（沙特）', 'Al Rajhi Bank（沙特）', 'Riyad Bank（沙特）', 'Saudi Awwal Bank（沙特）',
  ];
  const banks: Bank[] = names.map((name, i) => ({
    id: `example-bank-${i + 1}`,
    templateId: null,
    name,
    limitPct: 10,
  }));
  const terms = [7, 14, 21, 30, 45, 60, 90, 120, 180];
  const quotes: Quote[] = banks.flatMap((bank, i) =>
    Array.from({ length: 2 + (i % 2) }, (_, j) => {
      const days = terms[Math.floor(random() * terms.length)];
      const floating = i < 8 && j === 2;
      const product = i >= 8 ? '模拟商品穆拉巴哈' : floating ? '模拟浮息票据' : '模拟定存';
      return {
      id: `${bank.id}-quote-${j}`,
      bankId: bank.id,
      name: `${bank.name} ${days}天${product} ${j + 1}`,
      wamDays: floating ? Math.min(30, days) : days,
      walDays: days,
      rate: Number((2.2 + days * 0.006 + random() * 0.65).toFixed(3)),
      cap: Number((1.3 + random() * 6.8).toFixed(2)),
    };
    }),
  );
  const bankWeights = banks.map(() => 28 + random() * 12);
  const weightTotal = bankWeights.reduce((sum, weight) => sum + weight, 0);
  const amounts = new Map<string, number>();
  let allocated = 0;
  banks.forEach((bank, i) => {
    const exposure = i === banks.length - 1 ? 420 - allocated : Math.round(420 * bankWeights[i] / weightTotal * 100) / 100;
    allocated += exposure;
    const products = quotes.filter(q => q.bankId === bank.id);
    const weights = products.map(() => 0.4 + random());
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let used = 0;
    products.forEach((q, j) => {
      const amount = j === products.length - 1 ? exposure - used : Math.round(exposure * weights[j] / total * 100) / 100;
      used += amount;
      amounts.set(q.id, Number(amount.toFixed(2)));
    });
  });
  const holdings: Holding[] = [
    { id: 'example-cash', name: '现金缓冲', bankId: null, amount: 60, isCash: true, ytm: 0, wamDays: 0, walDays: 0 },
    ...quotes.map((quote) => ({
      id: `${quote.id}-holding`,
      ytm: quote.rate, wamDays: quote.wamDays, walDays: quote.walDays,
      name: quote.name,
      bankId: quote.bankId,
      amount: amounts.get(quote.id)!,
    })),
  ];
  const weighted = (value: (quote: Quote) => number) =>
    quotes.reduce((sum, quote, i) => sum + holdings[i + 1].amount * value(quote), 0) / 480;
  const portfolio: Portfolio = {
    tradeMode, aum: 480, transactionAmount: 48,
    ytm: weighted((q) => q.rate),
    wam: weighted((q) => q.wamDays ?? q.walDays),
    wal: weighted((q) => q.walDays),
    maxWam: 60, maxWal: 120,
    redemptionStressAmount: 48, cashBufferAmount: 60,
  };
  return { portfolio, banks, quotes, holdings };
}
