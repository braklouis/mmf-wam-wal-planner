import type { Holding } from './planner.ts';

export function holdingMetrics(holdings: Holding[]) {
  const aum = holdings.reduce((sum, h) => sum + h.amount, 0);
  const errors: string[] = [];
  const totals = { ytm: 0, wam: 0, wal: 0 };
  for (const h of holdings) {
    if (h.amount === 0) continue;
    const ytm = h.ytm;
    const wal = h.isCash ? 0 : h.walDays;
    const wam = h.isCash ? 0 : (h.wamDays ?? wal);
    if (ytm == null || !Number.isFinite(ytm) || wal == null || !Number.isFinite(wal) || wal < 0 || wam == null || !Number.isFinite(wam) || wam < 0 || wam > wal) {
      errors.push(h.name);
      continue;
    }
    // Normalize first: amount × yield can overflow even when the average is finite.
    const weight = h.amount / aum;
    totals.ytm += weight * ytm;
    totals.wam += weight * wam;
    totals.wal += weight * wal;
  }
  const valid = errors.length === 0 && Number.isFinite(aum) && aum >= 0 && holdings.every(h => Number.isFinite(h.amount) && h.amount >= 0);
  return { aum, ytm: valid && Number.isFinite(totals.ytm) ? totals.ytm : NaN,
    wam: valid && Number.isFinite(totals.wam) ? totals.wam : NaN,
    wal: valid && Number.isFinite(totals.wal) ? totals.wal : NaN, errors };
}
