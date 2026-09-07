import type { Portfolio, Quote, ModelBank, SubscriptionSuccessResult, FrontierMode, FrontierPoint, ReverseYtmResult } from './planner-types.ts';
import { concentrationBuckets } from './concentration-groups.ts';
import { SFC_MAX_WAM_DAYS, SFC_MAX_WAL_DAYS, EPSILON, number, percent, redemptionStress, optimiseSubscription } from './planner-core.ts';

export function describeBindingConstraints(
  outcome: SubscriptionSuccessResult,
  portfolio: Portfolio,
  quotes: Quote[],
) {
  const constraints: string[] = [];
  const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
  const effectiveMaxWam = Math.min(
    portfolio.maxWam ?? SFC_MAX_WAM_DAYS,
    SFC_MAX_WAM_DAYS,
  );
  const effectiveMaxWal = Math.min(
    portfolio.maxWal ?? SFC_MAX_WAL_DAYS,
    SFC_MAX_WAL_DAYS,
  );
  if (effectiveMaxWam - outcome.postWam <= 0.02) {
    constraints.push(`WAM ${number(effectiveMaxWam)} 天上限`);
  }
  if (effectiveMaxWal - outcome.postWal <= 0.02) {
    constraints.push(`WAL ${number(effectiveMaxWal)} 天上限`);
  }

  const bindingAmountTolerance = Math.max(0.001, outcome.postAum * 0.00001);
  const quotedBankIds = new Set(quotes.map((quote) => quote.bankId));
  outcome.banks.forEach((bank) => {
    if (quotedBankIds.has(bank.id) && bank.remaining <= bindingAmountTolerance) {
      constraints.push(`${bank.name}集中度 ${percent(bank.limitPct)}`);
    }
  });
  if (portfolio.inputMode !== 'simple') {
    const stress = redemptionStress(portfolio);
    concentrationBuckets(outcome.banks).forEach(bucket => {
      const finalExposure = outcome.banks.filter(bank => bucket.bankIds.includes(bank.id)).reduce((sum, bank) => sum + bank.finalExposure, 0);
      if (bucket.bankIds.some(id => quotedBankIds.has(id)) && stress.stressedAum * (bucket.limitPct / 100) - finalExposure <= bindingAmountTolerance) {
        constraints.push(`${bucket.name}${bucket.kind === 'group' ? '集团' : '同一实体'}集中度 ${percent(bucket.limitPct)}`);
      }
    });
  }
  outcome.allocations.forEach((allocation) => {
    const quote = quoteById.get(allocation.id);
    if (
      quote && quote.cap !== null &&
      quote.cap - allocation.amount <= bindingAmountTolerance
    ) {
      constraints.push(`「${allocation.name}」报价额度`);
    }
  });
  return constraints;
}

export function makeFrontierPoint(
  day: number,
  outcome: SubscriptionSuccessResult,
  portfolio: Portfolio,
  quotes: Quote[],
  isPlateauStart = false,
): FrontierPoint {
  return {
    day,
    ytm: outcome.postYtm,
    wam: outcome.postWam,
    wal: outcome.postWal,
    unallocated: outcome.unallocated,
    bindingConstraints: describeBindingConstraints(outcome, portfolio, quotes),
    isPlateauStart,
  };
}

export function buildFrontier(
  mode: FrontierMode,
  portfolio: Portfolio,
  banks: ModelBank[],
  quotes: Quote[],
): FrontierPoint[] {
  const postAum = portfolio.aum + portfolio.transactionAmount;
  if (postAum <= 0) return [];

  const minimum =
    mode === 'wam'
      ? (portfolio.aum / postAum) * portfolio.wam
      : (portfolio.aum / postAum) * portfolio.wal;
  const regulatoryCeiling =
    mode === 'wam' ? SFC_MAX_WAM_DAYS : SFC_MAX_WAL_DAYS;
  if (!Number.isFinite(minimum) || minimum > regulatoryCeiling + EPSILON) {
    return [];
  }
  const firstDay = Math.max(0, Math.ceil(minimum - EPSILON));

  const points: FrontierPoint[] = [];
  const minimumCandidate: Portfolio = {
    ...portfolio,
    ...(mode === 'wam' ? { maxWam: minimum } : { maxWal: minimum }),
  };
  const includedIntegerDays = new Set<number>();
  const minimumRounded = Math.round(minimum);
  if (Math.abs(minimum - minimumRounded) <= EPSILON) {
    includedIntegerDays.add(minimumRounded);
  }
  const minimumOutcome = optimiseSubscription(minimumCandidate, banks, quotes);
  if (minimumOutcome.ok) {
    points.push(
      makeFrontierPoint(minimum, minimumOutcome, minimumCandidate, quotes),
    );
  }

  for (let day = firstDay; day <= regulatoryCeiling; day += 1) {
    if (includedIntegerDays.has(day)) continue;
    const candidate: Portfolio = {
      ...portfolio,
      ...(mode === 'wam' ? { maxWam: day } : { maxWal: day }),
    };
    includedIntegerDays.add(day);
    const outcome = optimiseSubscription(candidate, banks, quotes);
    if (outcome.ok) {
      points.push(makeFrontierPoint(day, outcome, candidate, quotes));
    }
  }

  const last = points.at(-1);
  if (!last) return points;

  let lowLimit = minimum;
  let highLimit = regulatoryCeiling;
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const middle = (lowLimit + highLimit) / 2;
    const candidate: Portfolio = {
      ...portfolio,
      ...(mode === 'wam' ? { maxWam: middle } : { maxWal: middle }),
    };
    const outcome = optimiseSubscription(candidate, banks, quotes);
    if (outcome.ok && last.ytm - outcome.postYtm <= 1e-7) {
      highLimit = middle;
    } else {
      lowLimit = middle;
    }
  }

  const plateauCandidate: Portfolio = {
    ...portfolio,
    ...(mode === 'wam' ? { maxWam: highLimit } : { maxWal: highLimit }),
  };
  const plateauOutcome = optimiseSubscription(plateauCandidate, banks, quotes);
  if (plateauOutcome.ok) {
    const plateauPoint = makeFrontierPoint(
      highLimit,
      plateauOutcome,
      plateauCandidate,
      quotes,
      true,
    );
    const existingIndex = points.findIndex(
      (point) => Math.abs(point.day - highLimit) < 0.000001,
    );
    if (existingIndex >= 0) {
      points[existingIndex] = {
        ...plateauPoint,
        day: points[existingIndex].day,
      };
    } else {
      points.push(plateauPoint);
    }
    points.sort((left, right) => left.day - right.day);
  }
  return points;
}

export function solveTargetYtm(
  mode: FrontierMode,
  targetYtm: number,
  portfolio: Portfolio,
  banks: ModelBank[],
  quotes: Quote[],
): ReverseYtmResult {
  const label = mode.toUpperCase();
  const ceiling = mode === 'wam' ? SFC_MAX_WAM_DAYS : SFC_MAX_WAL_DAYS;
  const withLimit = (limit: number): Portfolio => ({
    ...portfolio,
    ...(mode === 'wam' ? { maxWam: limit } : { maxWal: limit }),
  });

  if (!Number.isFinite(targetYtm)) {
    return { ok: false, message: '目标 YTM 必须是有效数字。' };
  }

  const upper = optimiseSubscription(withLimit(ceiling), banks, quotes);
  if (!upper.ok) {
    return {
      ok: false,
      message: upper.messages[0] ?? '当前输入没有可行解。',
    };
  }

  const yieldTolerance = 1e-7;
  if (targetYtm > upper.postYtm + yieldTolerance) {
    return {
      ok: false,
      message: `在 SFC ${label} ≤ ${ceiling} 天及另一项当前约束下，最高只能达到 ${percent(upper.postYtm, 3)}。`,
    };
  }

  const currentDuration = mode === 'wam' ? portfolio.wam : portfolio.wal;
  const lowerBound = Math.max(
    0,
    (portfolio.aum / upper.postAum) * currentDuration,
  );
  const lower = optimiseSubscription(withLimit(lowerBound), banks, quotes);
  let lowLimit = lowerBound;
  // Even an immediately feasible minimum must pass through display rounding
  // and re-solving so the shown limit matches the returned allocation.
  let highLimit = lower.ok && lower.postYtm + yieldTolerance >= targetYtm
    ? lowerBound
    : ceiling;
  for (let iteration = 0; iteration < 52 && lowLimit < highLimit; iteration += 1) {
    const middle = (lowLimit + highLimit) / 2;
    const outcome = optimiseSubscription(withLimit(middle), banks, quotes);
    if (outcome.ok && outcome.postYtm + yieldTolerance >= targetYtm) {
      highLimit = middle;
    } else {
      lowLimit = middle;
    }
  }

  let displayedLimit = Math.min(
    ceiling,
    Math.ceil((highLimit - EPSILON) * 100) / 100,
  );
  let displayedResult = optimiseSubscription(
    withLimit(displayedLimit),
    banks,
    quotes,
  );
  if (
    !displayedResult.ok ||
    displayedResult.postYtm + yieldTolerance < targetYtm
  ) {
    displayedLimit = Math.min(ceiling, displayedLimit + 0.01);
    displayedResult = optimiseSubscription(
      withLimit(displayedLimit),
      banks,
      quotes,
    );
  }
  if (
    !displayedResult.ok ||
    displayedResult.postYtm + yieldTolerance < targetYtm
  ) {
    return {
      ok: false,
      message:
        '目标非常接近边界，当前精度下无法稳定生成配置，请略微降低目标 YTM。',
    };
  }

  return { ok: true, limit: displayedLimit, result: displayedResult };
}

