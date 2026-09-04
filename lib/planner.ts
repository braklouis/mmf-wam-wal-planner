export type TradeMode = 'subscription' | 'redemption';
export type WorkspaceView = 'planner' | 'holdings';

export type Portfolio = {
  tradeMode: TradeMode;
  aum: number;
  ytm: number;
  wam: number;
  wal: number;
  transactionAmount: number;
  maxWam: number | null;
  maxWal: number | null;
};

export type Bank = {
  id: string;
  templateId: string | null;
  name: string;
  limitPct: number;
};

export type ModelBank = Bank & {
  currentExposure: number;
};

export type BankTemplate = {
  id: string;
  name: string;
  defaultLimitPct: number;
};

export type AmountUnit = '元' | '万元' | '百万元' | '亿元';

export type Quote = {
  id: string;
  name: string;
  bankId: string;
  wamDays: number | null;
  walDays: number;
  rate: number;
  cap: number;
};

export type Holding = {
  id: string;
  name: string;
  bankId: string | null;
  amount: number;
  isBalancing?: boolean;
};

export type HoldingOutcome = Holding & {
  redeemed: number;
  finalAmount: number;
};

export type BankOutcome = ModelBank & {
  transactionChange: number;
  finalExposure: number;
  finalPct: number;
  remaining: number;
};

export type BaseSuccessResult = {
  ok: true;
  tradeMode: TradeMode;
  postAum: number;
  transactionAmount: number;
  appliedMaxWam: number;
  appliedMaxWal: number;
  postYtm: number;
  postWam: number;
  postWal: number;
  banks: BankOutcome[];
};

export type SubscriptionSuccessResult = BaseSuccessResult & {
  tradeMode: 'subscription';
  allocationYield: number;
  unallocated: number;
  allocations: Array<Quote & { amount: number }>;
};

export type RedemptionSuccessResult = BaseSuccessResult & {
  tradeMode: 'redemption';
  redemptionRatio: number;
  holdings: HoldingOutcome[];
};

export type SuccessResult = SubscriptionSuccessResult | RedemptionSuccessResult;

export type FailureResult = {
  ok: false;
  tradeMode: TradeMode;
  messages: string[];
  postAum: number;
};

export type ModelResult = SuccessResult | FailureResult;

export type SubscriptionModelResult = SubscriptionSuccessResult | FailureResult;

export type FrontierMode = 'wam' | 'wal';

export type FrontierPoint = {
  day: number;
  ytm: number;
  wam: number;
  wal: number;
  unallocated: number;
  bindingConstraints: string[];
  isPlateauStart: boolean;
};

export type ReverseYtmResult =
  | {
      ok: true;
      limit: number;
      result: SubscriptionSuccessResult;
    }
  | {
      ok: false;
      message: string;
    };

export type WebModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: {
        readOnlyHint: boolean;
        untrustedContentHint: boolean;
      };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};

export const initialPortfolio: Portfolio = {
  tradeMode: 'subscription',
  aum: 100,
  ytm: 2.5,
  wam: 30,
  wal: 50,
  transactionAmount: 20,
  maxWam: 32,
  maxWal: 60,
};

export const initialBanks: Bank[] = [
  {
    id: 'today-bank-a',
    templateId: 'bank-a',
    name: '银行 A',
    limitPct: 25,
  },
  {
    id: 'today-bank-b',
    templateId: 'bank-b',
    name: '银行 B',
    limitPct: 25,
  },
  {
    id: 'today-bank-c',
    templateId: 'bank-c',
    name: '金融机构 C',
    limitPct: 10,
  },
];

export const initialHoldings: Holding[] = [
  {
    id: 'holding-a-90',
    name: 'A行 90天定存',
    bankId: 'today-bank-a',
    amount: 15,
  },
  {
    id: 'holding-a-30',
    name: 'A行 30天定存',
    bankId: 'today-bank-a',
    amount: 10,
  },
  {
    id: 'holding-b-floating',
    name: 'B行浮息票据',
    bankId: 'today-bank-b',
    amount: 10,
  },
  {
    id: 'holding-c-7',
    name: 'C机构 7天票据',
    bankId: 'today-bank-c',
    amount: 5,
  },
  {
    id: 'holding-other',
    name: '现金及其他不计单一实体集中度资产',
    bankId: null,
    amount: 60,
    isBalancing: true,
  },
];

export const initialBankLibrary: BankTemplate[] = [
  { id: 'bank-a', name: '银行 A', defaultLimitPct: 25 },
  { id: 'bank-b', name: '银行 B', defaultLimitPct: 25 },
  { id: 'bank-c', name: '金融机构 C', defaultLimitPct: 10 },
  { id: 'bank-d', name: '银行 D', defaultLimitPct: 10 },
  { id: 'bank-e', name: '银行 E', defaultLimitPct: 10 },
];

export const BANK_LIBRARY_STORAGE_KEY = 'mmf-planner.bank-library.v1';

export const initialQuotes: Quote[] = [
  {
    id: 'quote-a-90',
    name: 'A行 90天定存',
    bankId: 'today-bank-a',
    wamDays: null,
    walDays: 90,
    rate: 5,
    cap: 20,
  },
  {
    id: 'quote-a-30',
    name: 'A行 30天定存',
    bankId: 'today-bank-a',
    wamDays: null,
    walDays: 30,
    rate: 4.2,
    cap: 15,
  },
  {
    id: 'quote-b-floating-180',
    name: 'B行 180天浮息票据',
    bankId: 'today-bank-b',
    wamDays: 30,
    walDays: 180,
    rate: 4,
    cap: 20,
  },
  {
    id: 'quote-c-7',
    name: 'C机构 7天票据',
    bankId: 'today-bank-c',
    wamDays: null,
    walDays: 7,
    rate: 3.2,
    cap: 20,
  },
];

export const EPSILON = 1e-8;
const SIMPLEX_EPSILON = Number.EPSILON * 64;
const RELATIVE_TOLERANCE = 1e-12;
const MIN_STABLE_REMAINING_AUM_RATIO = 1e-12;
const MAX_RECONCILIATION_ERROR_RATIO = 1e-4;
export const SFC_MAX_WAM_DAYS = 60;
export const SFC_MAX_WAL_DAYS = 120;
export const SFC_MAX_BANK_CONCENTRATION_PCT = 25;
export const UNASSIGNED_BANK_ID = '__unassigned__';
export const EXCLUDED_BANK_SELECT_VALUE = '__excluded__';

export function amountTolerance(...values: number[]) {
  const scale = Math.max(
    0,
    ...values.filter(Number.isFinite).map((value) => Math.abs(value)),
  );
  return Math.max(Number.MIN_VALUE, scale * RELATIVE_TOLERANCE);
}

function exceedsUpperBound(value: number, upperBound: number) {
  return (
    !Number.isFinite(value) ||
    !Number.isFinite(upperBound) ||
    value > upperBound + amountTolerance(value, upperBound)
  );
}

export function termValueError(
  value: number | null,
  metric: 'WAM' | 'WAL',
  optional = false,
) {
  if (value === null) return optional ? null : `${metric} 不能为空。`;
  if (!Number.isFinite(value)) return `${metric} 必须是有效数字。`;
  if (value < 0) return `${metric} 不得小于 0 天。`;
  return null;
}

export function regulatoryTermError(
  value: number | null,
  metric: 'WAM' | 'WAL',
  maximum: number,
  optional = false,
) {
  const valueError = termValueError(value, metric, optional);
  if (valueError || value === null) return valueError;
  if (value > maximum) {
    return `SFC 要求 MMF 组合 ${metric} 不得超过 ${maximum} 天。`;
  }
  return null;
}

export function currentTermComplianceWarning(
  value: number,
  metric: 'WAM' | 'WAL',
  maximum: number,
  tradeMode: TradeMode,
) {
  if (!Number.isFinite(value) || value <= maximum) return null;
  if (tradeMode === 'redemption') {
    return `当前组合 ${metric} 已超过 SFC ${maximum} 天上限；同比例赎回不会改变该指标。`;
  }
  return `当前组合 ${metric} 已超过 SFC ${maximum} 天上限；该事实仍可录入，以测算回到合规区间的方案。`;
}

export function bankConcentrationError(value: number) {
  if (!Number.isFinite(value)) return '集中度上限必须是有效数字。';
  if (value < 0) return '集中度上限不得低于 0%。';
  if (value > SFC_MAX_BANK_CONCENTRATION_PCT) {
    return 'SFC 对单一实体的最高例外上限为 25%；一般上限仍为 10%。';
  }
  return null;
}

export function bankConcentrationNotice(value: number) {
  if (
    !Number.isFinite(value) ||
    value <= 10 ||
    value > SFC_MAX_BANK_CONCENTRATION_PCT
  ) {
    return null;
  }
  return '超过一般 10% 上限：仅适用于经合规确认符合 SFC 8.2(g)(i) 条件的实质金融机构。';
}

export function quoteWamDays(quote: Quote) {
  return quote.wamDays ?? quote.walDays;
}

export function postAumOf(portfolio: Portfolio) {
  const direction = portfolio.tradeMode === 'subscription' ? 1 : -1;
  return portfolio.aum + direction * portfolio.transactionAmount;
}

export function postTradeExistingExposure(
  portfolio: Portfolio,
  currentExposure: number,
) {
  if (portfolio.tradeMode === 'subscription') return currentExposure;
  const postAum = postAumOf(portfolio);
  if (
    !Number.isFinite(portfolio.aum) ||
    portfolio.aum <= 0 ||
    !Number.isFinite(postAum) ||
    postAum <= 0
  ) {
    return Number.NaN;
  }
  return currentExposure * (postAum / portfolio.aum);
}

export function aggregateInstitutionExposures(
  banks: Bank[],
  holdings: Holding[],
): ModelBank[] {
  const exposureByBank = new Map(banks.map((bank) => [bank.id, 0]));
  holdings.forEach((holding) => {
    if (holding.bankId === null || !exposureByBank.has(holding.bankId)) return;
    exposureByBank.set(
      holding.bankId,
      (exposureByBank.get(holding.bankId) ?? 0) + holding.amount,
    );
  });
  return banks.map((bank) => ({
    ...bank,
    currentExposure: exposureByBank.get(bank.id) ?? 0,
  }));
}

export function holdingValidationErrors(
  portfolio: Portfolio,
  banks: Bank[],
  holdings: Holding[],
) {
  const errors: string[] = [];
  const bankIds = new Set(banks.map((bank) => bank.id));

  holdings.forEach((holding) => {
    if (!holding.name.trim()) errors.push('持仓名称不能为空。');
    if (!Number.isFinite(holding.amount) || holding.amount < 0) {
      errors.push(`${holding.name || '某项持仓'}的当前金额必须是非负数字。`);
    }
    if (holding.bankId === UNASSIGNED_BANK_ID) {
      errors.push(`${holding.name || '某项持仓'}尚未选择集中度归属机构。`);
    } else if (holding.bankId !== null && !bankIds.has(holding.bankId)) {
      errors.push(`${holding.name || '某项持仓'}对应的机构已不存在。`);
    }
  });

  const amountsAreValid = holdings.every(
    (holding) => Number.isFinite(holding.amount) && holding.amount >= 0,
  );
  if (amountsAreValid && Number.isFinite(portfolio.aum) && portfolio.aum >= 0) {
    const holdingTotal = holdings.reduce(
      (sum, holding) => sum + holding.amount,
      0,
    );
    const tolerance = amountTolerance(holdingTotal, portfolio.aum);
    const difference = holdingTotal - portfolio.aum;
    if (difference > tolerance) {
      errors.push(
        `当前持仓合计（${number(holdingTotal, 8)}）比当前 AUM（${number(portfolio.aum, 8)}）超出 ${number(difference, 8)}；请调低或删除对应持仓。`,
      );
    } else if (difference < -tolerance) {
      errors.push(
        `当前持仓合计（${number(holdingTotal, 8)}）比当前 AUM（${number(portfolio.aum, 8)}）少 ${number(Math.abs(difference), 8)}；请补录持仓或计入现金及其他。`,
      );
    }
  }

  return [...new Set(errors)];
}

export function institutionExposureTotalError(
  portfolio: Portfolio,
  banks: ModelBank[],
) {
  if (
    !Number.isFinite(portfolio.aum) ||
    portfolio.aum < 0 ||
    banks.some(
      (bank) =>
        !Number.isFinite(bank.currentExposure) || bank.currentExposure < 0,
    )
  ) {
    return null;
  }

  const totalExposure = banks.reduce(
    (sum, bank) => sum + bank.currentExposure,
    0,
  );
  if (
    totalExposure >
    portfolio.aum + amountTolerance(totalExposure, portfolio.aum)
  ) {
    return `已录入机构的当前持仓合计（${number(totalExposure)}）不得超过当前 AUM（${number(portfolio.aum)}）。`;
  }
  return null;
}

export function buildProRataHoldingOutcomes(
  holdings: Holding[],
  redemptionAmount: number,
  aum: number,
): HoldingOutcome[] {
  if (
    !Number.isFinite(aum) ||
    aum <= 0 ||
    !Number.isFinite(redemptionAmount) ||
    redemptionAmount < 0 ||
    holdings.some(
      (holding) => !Number.isFinite(holding.amount) || holding.amount < 0,
    )
  ) {
    return [];
  }

  const ratio = redemptionAmount / aum;
  const outcomes = holdings.map((holding) => {
    const redeemed = Math.min(
      holding.amount,
      Math.max(0, holding.amount * ratio),
    );
    return {
      ...holding,
      redeemed,
      finalAmount: holding.amount - redeemed,
    };
  });
  if (!outcomes.length) return outcomes;

  let residual =
    redemptionAmount -
    outcomes.reduce((sum, holding) => sum + holding.redeemed, 0);
  const adjustmentOrder = outcomes
    .map((_, index) => index)
    .sort(
      (left, right) =>
        (residual >= 0
          ? outcomes[right].amount - outcomes[right].redeemed
          : outcomes[right].redeemed) -
        (residual >= 0
          ? outcomes[left].amount - outcomes[left].redeemed
          : outcomes[left].redeemed),
    );

  adjustmentOrder.forEach((index) => {
    if (residual === 0) return;
    const holding = outcomes[index];
    const previousRedeemed = holding.redeemed;
    const capacity =
      residual > 0
        ? Math.max(0, holding.amount - previousRedeemed)
        : Math.max(0, previousRedeemed);
    const requestedAdjustment =
      residual > 0
        ? Math.min(residual, capacity)
        : -Math.min(-residual, capacity);
    const redeemed = Math.min(
      holding.amount,
      Math.max(0, previousRedeemed + requestedAdjustment),
    );
    residual -= redeemed - previousRedeemed;
    outcomes[index] = {
      ...holding,
      redeemed,
      finalAmount: Math.max(0, holding.amount - redeemed),
    };
  });

  if (
    Math.abs(residual) >
    amountTolerance(
      aum,
      redemptionAmount,
      ...holdings.map(({ amount }) => amount),
    )
  ) {
    return [];
  }

  return outcomes.map((holding) => {
    const redeemed = Math.min(holding.amount, Math.max(0, holding.redeemed));
    return {
      ...holding,
      redeemed,
      finalAmount: Math.max(0, holding.amount - redeemed),
    };
  });
}

// Primal simplex for max c'x subject to Ax <= b, x >= 0.
// All planner constraints have a non-negative right-hand side, so the slack
// variables provide an immediate feasible starting point.
export function simplex(
  objective: number[],
  matrix: number[][],
  limits: number[],
): number[] | null {
  const n = objective.length;
  const m = matrix.length;
  if (
    limits.length !== m ||
    matrix.some(
      (row, index) =>
        row.length !== n ||
        row.some((value) => !Number.isFinite(value)) ||
        !Number.isFinite(limits[index]) ||
        limits[index] < 0,
    )
  ) {
    return null;
  }
  if (n === 0) return [];

  const width = n + m + 1;
  const height = m + 1;
  const t = Array.from({ length: height }, () => Array(width).fill(0));
  const basis = Array.from({ length: m }, (_, i) => n + i);

  for (let row = 0; row < m; row += 1) {
    const rowScale = Math.max(
      Math.abs(limits[row]),
      ...matrix[row].map((value) => Math.abs(value)),
    );
    if (!Number.isFinite(rowScale)) return null;
    if (rowScale === 0) {
      t[row][n + row] = 1;
      continue;
    }
    for (let col = 0; col < n; col += 1) {
      t[row][col] = matrix[row][col] / rowScale;
    }
    t[row][n + row] = 1;
    t[row][width - 1] = limits[row] / rowScale;
  }
  const objectiveScale = Math.max(
    0,
    ...objective.filter(Number.isFinite).map((value) => Math.abs(value)),
  );
  if (objective.some((value) => !Number.isFinite(value))) return null;
  for (let col = 0; col < n; col += 1) {
    t[m][col] = objectiveScale === 0 ? 0 : -objective[col] / objectiveScale;
  }

  for (let iteration = 0; iteration < 2000; iteration += 1) {
    let enter = -1;
    for (let col = 0; col < width - 1; col += 1) {
      if (t[m][col] < -SIMPLEX_EPSILON) {
        enter = col;
        break;
      }
    }
    if (enter < 0) {
      const answer = Array(n).fill(0);
      basis.forEach((variable, row) => {
        if (variable < n) answer[variable] = Math.max(0, t[row][width - 1]);
      });
      return answer;
    }

    let leave = -1;
    let ratio = Number.POSITIVE_INFINITY;
    for (let row = 0; row < m; row += 1) {
      if (t[row][enter] <= SIMPLEX_EPSILON) continue;
      const candidate = t[row][width - 1] / t[row][enter];
      const ratioTolerance =
        Number.EPSILON *
        16 *
        Math.max(
          Number.MIN_VALUE,
          Math.abs(candidate),
          Number.isFinite(ratio) ? Math.abs(ratio) : 0,
        );
      if (
        candidate < ratio - ratioTolerance ||
        (Math.abs(candidate - ratio) <= ratioTolerance &&
          (leave < 0 || basis[row] < basis[leave]))
      ) {
        leave = row;
        ratio = candidate;
      }
    }
    if (leave < 0) return null;

    const pivot = t[leave][enter];
    for (let col = 0; col < width; col += 1) t[leave][col] /= pivot;
    for (let row = 0; row < height; row += 1) {
      if (row === leave || Math.abs(t[row][enter]) <= SIMPLEX_EPSILON) {
        continue;
      }
      const factor = t[row][enter];
      for (let col = 0; col < width; col += 1) {
        t[row][col] -= factor * t[leave][col];
      }
    }
    basis[leave] = enter;
  }
  return null;
}

export function optimiseSubscription(
  portfolio: Portfolio,
  banks: ModelBank[],
  quotes: Quote[],
): SubscriptionModelResult {
  const errors: string[] = [];
  const postAum = portfolio.aum + portfolio.transactionAmount;

  if (!Number.isFinite(portfolio.aum) || portfolio.aum < 0) {
    errors.push('当前 AUM 必须为非负数字。');
  }
  if (
    !Number.isFinite(portfolio.transactionAmount) ||
    portfolio.transactionAmount < 0
  ) {
    errors.push('可配置金额必须为非负数字。');
  }
  if (!Number.isFinite(postAum) || postAum <= 0) {
    errors.push('交易后 AUM 必须为大于 0 的有效数字。');
  }
  if (!Number.isFinite(portfolio.ytm)) {
    errors.push('当前 YTM 必须是有效数字。');
  }
  const currentWamError = termValueError(portfolio.wam, 'WAM');
  const currentWalError = termValueError(portfolio.wal, 'WAL');
  const maxWamError = regulatoryTermError(
    portfolio.maxWam,
    'WAM',
    SFC_MAX_WAM_DAYS,
    true,
  );
  const maxWalError = regulatoryTermError(
    portfolio.maxWal,
    'WAL',
    SFC_MAX_WAL_DAYS,
    true,
  );
  if (currentWamError) errors.push(`当前 ${currentWamError}`);
  if (currentWalError) errors.push(`当前 ${currentWalError}`);
  if (maxWamError) errors.push(`上限输入错误：${maxWamError}`);
  if (maxWalError) errors.push(`上限输入错误：${maxWalError}`);

  const bankIds = new Set(banks.map((bank) => bank.id));
  banks.forEach((bank) => {
    if (!bank.name.trim()) errors.push('机构名称不能为空。');
    if (!Number.isFinite(bank.currentExposure) || bank.currentExposure < 0) {
      errors.push(`${bank.name || '某机构'}的当前持有金额无效。`);
    }
    const concentrationError = bankConcentrationError(bank.limitPct);
    if (concentrationError) {
      errors.push(`${bank.name || '某机构'}：${concentrationError}`);
    }
    const finalCap = postAum * (bank.limitPct / 100);
    if (
      Number.isFinite(postAum) &&
      postAum > 0 &&
      Number.isFinite(bank.currentExposure) &&
      !concentrationError &&
      exceedsUpperBound(bank.currentExposure, finalCap)
    ) {
      errors.push(
        `${bank.name || '某机构'}现有敞口已超过交易后上限，新增配置无法修复。`,
      );
    }
  });
  const exposureTotalError = institutionExposureTotalError(portfolio, banks);
  if (exposureTotalError) errors.push(exposureTotalError);

  quotes.forEach((quote) => {
    if (!quote.name.trim()) errors.push('产品名称不能为空。');
    if (!bankIds.has(quote.bankId)) {
      errors.push(`${quote.name || '某产品'}没有对应的机构。`);
    }
    if (
      quote.wamDays !== null &&
      (!Number.isFinite(quote.wamDays) || quote.wamDays < 0)
    ) {
      errors.push(`${quote.name || '某产品'}计入 WAM 的天数无效。`);
    }
    if (!Number.isFinite(quote.walDays) || quote.walDays < 0) {
      errors.push(`${quote.name || '某产品'}计入 WAL 的天数无效。`);
    }
    if (
      Number.isFinite(quoteWamDays(quote)) &&
      Number.isFinite(quote.walDays) &&
      quoteWamDays(quote) > quote.walDays + EPSILON
    ) {
      errors.push(`${quote.name || '某产品'}的 WAM 天数不能大于 WAL 天数。`);
    }
    if (!Number.isFinite(quote.rate)) {
      errors.push(`${quote.name || '某产品'}的利率无效。`);
    }
    if (!Number.isFinite(quote.cap) || quote.cap < 0) {
      errors.push(`${quote.name || '某产品'}的报价额度无效。`);
    }
  });

  const effectiveMaxWam = Math.min(
    portfolio.maxWam ?? SFC_MAX_WAM_DAYS,
    SFC_MAX_WAM_DAYS,
  );
  const effectiveMaxWal = Math.min(
    portfolio.maxWal ?? SFC_MAX_WAL_DAYS,
    SFC_MAX_WAL_DAYS,
  );
  const currentWeight = portfolio.aum / postAum;
  const transactionShare = portfolio.transactionAmount / postAum;
  const wamAllowance = effectiveMaxWam - currentWeight * portfolio.wam;
  const walAllowance = effectiveMaxWal - currentWeight * portfolio.wal;
  if (
    !Number.isFinite(currentWeight) ||
    !Number.isFinite(transactionShare) ||
    !Number.isFinite(wamAllowance) ||
    !Number.isFinite(walAllowance)
  ) {
    errors.push('输入金额或期限的数值尺度超出可计算范围。');
  }
  if (
    Number.isFinite(wamAllowance) &&
    wamAllowance < -amountTolerance(wamAllowance, effectiveMaxWam)
  ) {
    errors.push('即使新增资金全部留作现金，也无法满足 WAM 上限。');
  }
  if (
    Number.isFinite(walAllowance) &&
    walAllowance < -amountTolerance(walAllowance, effectiveMaxWal)
  ) {
    errors.push('即使新增资金全部留作现金，也无法满足 WAL 上限。');
  }
  if (errors.length) {
    return {
      ok: false,
      tradeMode: 'subscription',
      messages: errors,
      postAum,
    };
  }

  const matrix: number[][] = [];
  const limits: number[] = [];
  matrix.push(quotes.map(() => 1));
  limits.push(transactionShare);

  matrix.push(quotes.map(quoteWamDays));
  limits.push(Math.max(0, wamAllowance));
  matrix.push(quotes.map((quote) => quote.walDays));
  limits.push(Math.max(0, walAllowance));
  banks.forEach((bank) => {
    matrix.push(quotes.map((quote) => (quote.bankId === bank.id ? 1 : 0)));
    limits.push(
      Math.max(0, bank.limitPct / 100 - bank.currentExposure / postAum),
    );
  });
  quotes.forEach((quote, quoteIndex) => {
    matrix.push(quotes.map((_, index) => (index === quoteIndex ? 1 : 0)));
    limits.push(Math.min(transactionShare, quote.cap / postAum));
  });

  const raw = simplex(
    quotes.map((quote) => quote.rate),
    matrix,
    limits,
  );
  if (!raw) {
    return {
      ok: false,
      tradeMode: 'subscription',
      messages: ['求解过程没有收敛，请检查输入数据。'],
      postAum,
    };
  }

  const allocationShares = raw.map((value) =>
    value < 0 && Math.abs(value) <= amountTolerance(value) ? 0 : value,
  );
  const investedShare = allocationShares.reduce((sum, value) => sum + value, 0);
  const interestShare = allocationShares.reduce(
    (sum, value, index) => sum + value * quotes[index].rate,
    0,
  );
  const wamShareDuration = allocationShares.reduce(
    (sum, value, index) => sum + value * quoteWamDays(quotes[index]),
    0,
  );
  const walShareDuration = allocationShares.reduce(
    (sum, value, index) => sum + value * quotes[index].walDays,
    0,
  );
  const allocation = allocationShares.map((share) => share * postAum);
  const invested = allocation.reduce((sum, value) => sum + value, 0);
  const postYtm = currentWeight * portfolio.ytm + interestShare;
  const postWam = currentWeight * portfolio.wam + wamShareDuration;
  const postWal = currentWeight * portfolio.wal + walShareDuration;

  const allocationShareByBank = new Map(banks.map((bank) => [bank.id, 0]));
  allocationShares.forEach((share, index) => {
    const bankId = quotes[index].bankId;
    if (!allocationShareByBank.has(bankId)) return;
    allocationShareByBank.set(
      bankId,
      (allocationShareByBank.get(bankId) ?? 0) + share,
    );
  });
  const bankOutcomes = banks.map((bank) => {
    const transactionChange =
      (allocationShareByBank.get(bank.id) ?? 0) * postAum;
    const finalExposure = bank.currentExposure + transactionChange;
    const finalCap = postAum * (bank.limitPct / 100);
    return {
      ...bank,
      transactionChange,
      finalExposure,
      finalPct: (finalExposure / postAum) * 100,
      remaining: Math.max(0, finalCap - finalExposure),
    };
  });

  const constraintErrors: string[] = [];
  allocationShares.forEach((share, index) => {
    if (!Number.isFinite(share) || share < 0) {
      constraintErrors.push(
        `${quotes[index].name || '某产品'}的配置金额无效。`,
      );
    }
    if (exceedsUpperBound(allocation[index], quotes[index].cap)) {
      constraintErrors.push(`${quotes[index].name || '某产品'}超过报价额度。`);
    }
  });
  if (
    exceedsUpperBound(investedShare, transactionShare) ||
    exceedsUpperBound(invested, portfolio.transactionAmount)
  ) {
    constraintErrors.push('配置总额超过可配置金额。');
  }
  if (exceedsUpperBound(postWam, effectiveMaxWam)) {
    constraintErrors.push('交易后 WAM 超过所选上限。');
  }
  if (exceedsUpperBound(postWal, effectiveMaxWal)) {
    constraintErrors.push('交易后 WAL 超过所选上限。');
  }
  bankOutcomes.forEach((bank) => {
    const finalCap = postAum * (bank.limitPct / 100);
    if (
      !Number.isFinite(bank.finalPct) ||
      exceedsUpperBound(bank.finalExposure, finalCap)
    ) {
      constraintErrors.push(`${bank.name || '某机构'}超过集中度上限。`);
    }
  });
  if (
    [postYtm, postWam, postWal, invested, interestShare].some(
      (value) => !Number.isFinite(value),
    )
  ) {
    constraintErrors.push('求解结果包含不可用数值。');
  }
  if (constraintErrors.length) {
    return {
      ok: false,
      tradeMode: 'subscription',
      messages: ['求解结果未通过硬约束复核。', ...new Set(constraintErrors)],
      postAum,
    };
  }

  return {
    ok: true,
    tradeMode: 'subscription',
    postAum,
    transactionAmount: portfolio.transactionAmount,
    appliedMaxWam: effectiveMaxWam,
    appliedMaxWal: effectiveMaxWal,
    postYtm,
    postWam,
    postWal,
    allocationYield:
      portfolio.transactionAmount > 0 ? interestShare / transactionShare : 0,
    unallocated: Math.max(0, portfolio.transactionAmount - invested),
    allocations: quotes
      .map((quote, index) => ({ ...quote, amount: allocation[index] }))
      .filter((quote) => quote.amount > 0),
    banks: bankOutcomes,
  };
}

export function calculateProRataRedemption(
  portfolio: Portfolio,
  banks: ModelBank[],
  holdings: Holding[],
): ModelResult {
  const errors: string[] = [];
  const postAum = postAumOf(portfolio);

  if (!Number.isFinite(portfolio.aum) || portfolio.aum <= 0) {
    errors.push('净赎回时，当前 AUM 必须为大于 0 的数字。');
  }
  if (
    !Number.isFinite(portfolio.transactionAmount) ||
    portfolio.transactionAmount < 0
  ) {
    errors.push('净赎回金额必须为非负数字。');
  } else if (
    Number.isFinite(portfolio.aum) &&
    portfolio.transactionAmount >= portfolio.aum
  ) {
    errors.push('净赎回金额必须小于当前 AUM；全部赎回后无法计算组合指标。');
  }
  if (!Number.isFinite(postAum) || postAum <= 0) {
    errors.push('交易后 AUM 必须大于 0。');
  } else if (
    Number.isFinite(portfolio.aum) &&
    portfolio.aum > 0 &&
    postAum / portfolio.aum < MIN_STABLE_REMAINING_AUM_RATIO
  ) {
    errors.push(
      '交易后剩余 AUM 过小，已超出可可靠计算持仓与集中度的数值精度。',
    );
  }
  if (!Number.isFinite(portfolio.ytm)) {
    errors.push('当前 YTM 必须是有效数字。');
  }

  const currentWamError = termValueError(portfolio.wam, 'WAM');
  const currentWalError = termValueError(portfolio.wal, 'WAL');
  const maxWamError = regulatoryTermError(
    portfolio.maxWam,
    'WAM',
    SFC_MAX_WAM_DAYS,
    true,
  );
  const maxWalError = regulatoryTermError(
    portfolio.maxWal,
    'WAL',
    SFC_MAX_WAL_DAYS,
    true,
  );
  if (currentWamError) errors.push(`当前 ${currentWamError}`);
  if (currentWalError) errors.push(`当前 ${currentWalError}`);
  if (maxWamError) errors.push(`上限输入错误：${maxWamError}`);
  if (maxWalError) errors.push(`上限输入错误：${maxWalError}`);

  const effectiveMaxWam = Math.min(
    portfolio.maxWam ?? SFC_MAX_WAM_DAYS,
    SFC_MAX_WAM_DAYS,
  );
  const effectiveMaxWal = Math.min(
    portfolio.maxWal ?? SFC_MAX_WAL_DAYS,
    SFC_MAX_WAL_DAYS,
  );
  if (
    !currentWamError &&
    !maxWamError &&
    portfolio.wam > effectiveMaxWam + EPSILON
  ) {
    errors.push(
      `按比例赎回不会改变 WAM；当前 ${number(portfolio.wam)} 天仍超过 ${number(effectiveMaxWam)} 天上限。`,
    );
  }
  if (
    !currentWalError &&
    !maxWalError &&
    portfolio.wal > effectiveMaxWal + EPSILON
  ) {
    errors.push(
      `按比例赎回不会改变 WAL；当前 ${number(portfolio.wal)} 天仍超过 ${number(effectiveMaxWal)} 天上限。`,
    );
  }

  const bankIds = new Set(banks.map((bank) => bank.id));
  banks.forEach((bank) => {
    if (!bank.name.trim()) errors.push('机构名称不能为空。');
    if (!Number.isFinite(bank.currentExposure) || bank.currentExposure < 0) {
      errors.push(`${bank.name || '某机构'}的当前持有金额无效。`);
    }
    const concentrationError = bankConcentrationError(bank.limitPct);
    if (concentrationError) {
      errors.push(`${bank.name || '某机构'}：${concentrationError}`);
    }
    if (
      Number.isFinite(portfolio.aum) &&
      portfolio.aum > 0 &&
      Number.isFinite(bank.currentExposure) &&
      !concentrationError &&
      exceedsUpperBound(
        bank.currentExposure,
        portfolio.aum * (bank.limitPct / 100),
      )
    ) {
      errors.push(
        `${bank.name || '某机构'}当前占比超过适用上限；同比例赎回后占比不变，无法修复该超限。`,
      );
    }
  });
  holdings.forEach((holding) => {
    if (holding.bankId !== null && !bankIds.has(holding.bankId)) {
      errors.push(`${holding.name || '某项持仓'}没有对应的集中度归属机构。`);
    }
  });
  const exposureTotalError = institutionExposureTotalError(portfolio, banks);
  if (exposureTotalError) errors.push(exposureTotalError);

  if (errors.length) {
    return {
      ok: false,
      tradeMode: 'redemption',
      messages: [...new Set(errors)],
      postAum,
    };
  }

  const holdingOutcomes = buildProRataHoldingOutcomes(
    holdings,
    portfolio.transactionAmount,
    portfolio.aum,
  );
  const redeemedTotal = holdingOutcomes.reduce(
    (sum, holding) => sum + holding.redeemed,
    0,
  );
  const finalTotal = holdingOutcomes.reduce(
    (sum, holding) => sum + holding.finalAmount,
    0,
  );
  const redeemedTolerance = amountTolerance(
    redeemedTotal,
    portfolio.transactionAmount,
  );
  // A near-total redemption subtracts two pre-trade-sized numbers. Keep the
  // reconciliation tolerance tied to postAUM, with only a machine-precision
  // allowance for that subtraction (not a business tolerance based on old AUM).
  const subtractionRoundingTolerance =
    Number.EPSILON *
    32 *
    Math.max(
      Math.abs(portfolio.aum),
      Math.abs(portfolio.transactionAmount),
      ...holdings.map((holding) => Math.abs(holding.amount)),
    );
  const finalTolerance = Math.max(
    amountTolerance(finalTotal, postAum),
    Math.min(
      subtractionRoundingTolerance,
      Math.abs(postAum) * MAX_RECONCILIATION_ERROR_RATIO,
    ),
  );
  if (
    holdingOutcomes.length !== holdings.length ||
    !Number.isFinite(redeemedTotal) ||
    !Number.isFinite(finalTotal) ||
    Math.abs(redeemedTotal - portfolio.transactionAmount) > redeemedTolerance ||
    Math.abs(finalTotal - postAum) > finalTolerance ||
    holdingOutcomes.some((holding) => {
      const holdingTolerance = amountTolerance(
        holding.amount,
        holding.redeemed,
        holding.finalAmount,
      );
      return (
        !Number.isFinite(holding.redeemed) ||
        !Number.isFinite(holding.finalAmount) ||
        holding.redeemed < -holdingTolerance ||
        holding.redeemed > holding.amount + holdingTolerance ||
        holding.finalAmount < -holdingTolerance ||
        Math.abs(holding.redeemed + holding.finalAmount - holding.amount) >
          holdingTolerance
      );
    })
  ) {
    return {
      ok: false,
      tradeMode: 'redemption',
      messages: ['逐项赎回金额未能稳定对账，请检查当前持仓金额。'],
      postAum,
    };
  }
  const finalExposureByBank = new Map(banks.map((bank) => [bank.id, 0]));
  holdingOutcomes.forEach((holding) => {
    if (holding.bankId === null || !finalExposureByBank.has(holding.bankId)) {
      return;
    }
    finalExposureByBank.set(
      holding.bankId,
      (finalExposureByBank.get(holding.bankId) ?? 0) + holding.finalAmount,
    );
  });
  const bankOutcomes = banks.map((bank) => {
    const finalExposure = finalExposureByBank.get(bank.id) ?? 0;
    const finalCap = postAum * (bank.limitPct / 100);
    return {
      ...bank,
      transactionChange: finalExposure - bank.currentExposure,
      finalExposure,
      finalPct: (finalExposure / postAum) * 100,
      remaining: Math.max(0, finalCap - finalExposure),
    };
  });
  const postTradeErrors: string[] = [];
  if (exceedsUpperBound(portfolio.wam, effectiveMaxWam)) {
    postTradeErrors.push('交易后 WAM 超过所选上限。');
  }
  if (exceedsUpperBound(portfolio.wal, effectiveMaxWal)) {
    postTradeErrors.push('交易后 WAL 超过所选上限。');
  }
  bankOutcomes.forEach((bank) => {
    const finalCap = postAum * (bank.limitPct / 100);
    if (
      !Number.isFinite(bank.finalPct) ||
      exceedsUpperBound(bank.finalExposure, finalCap)
    ) {
      postTradeErrors.push(`${bank.name || '某机构'}超过集中度上限。`);
    }
  });
  const finalInstitutionExposure = bankOutcomes.reduce(
    (sum, bank) => sum + bank.finalExposure,
    0,
  );
  if (finalInstitutionExposure > postAum + finalTolerance) {
    postTradeErrors.push('交易后机构敞口合计超过交易后 AUM。');
  }
  if (postTradeErrors.length) {
    return {
      ok: false,
      tradeMode: 'redemption',
      messages: [
        '赎回结果未通过交易后硬约束复核。',
        ...new Set(postTradeErrors),
      ],
      postAum,
    };
  }
  return {
    ok: true,
    tradeMode: 'redemption',
    postAum,
    transactionAmount: portfolio.transactionAmount,
    redemptionRatio: portfolio.transactionAmount / portfolio.aum,
    appliedMaxWam: effectiveMaxWam,
    appliedMaxWal: effectiveMaxWal,
    postYtm: portfolio.ytm,
    postWam: portfolio.wam,
    postWal: portfolio.wal,
    holdings: holdingOutcomes,
    banks: bankOutcomes,
  };
}

export function calculatePlan(
  portfolio: Portfolio,
  banks: ModelBank[],
  quotes: Quote[],
  holdings: Holding[],
): ModelResult {
  const holdingErrors = holdingValidationErrors(portfolio, banks, holdings);
  if (holdingErrors.length) {
    return {
      ok: false,
      tradeMode: portfolio.tradeMode,
      messages: holdingErrors,
      postAum: postAumOf(portfolio),
    };
  }
  return portfolio.tradeMode === 'redemption'
    ? calculateProRataRedemption(portfolio, banks, holdings)
    : optimiseSubscription(portfolio, banks, quotes);
}

export function describeBindingConstraints(
  outcome: SubscriptionSuccessResult,
  portfolio: Portfolio,
  quotes: Quote[],
) {
  const constraints: string[] = [];
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

  const amountTolerance = Math.max(0.001, outcome.postAum * 0.00001);
  const quotedBankIds = new Set(quotes.map((quote) => quote.bankId));
  outcome.banks.forEach((bank) => {
    if (quotedBankIds.has(bank.id) && bank.remaining <= amountTolerance) {
      constraints.push(`${bank.name}集中度 ${percent(bank.limitPct)}`);
    }
  });
  outcome.allocations.forEach((allocation) => {
    const quote = quotes.find((item) => item.id === allocation.id);
    if (quote && quote.cap - allocation.amount <= amountTolerance) {
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
      ? (portfolio.aum * portfolio.wam) / postAum
      : (portfolio.aum * portfolio.wal) / postAum;
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
  const minimumOutcome = optimiseSubscription(minimumCandidate, banks, quotes);
  if (minimumOutcome.ok) {
    points.push(
      makeFrontierPoint(minimum, minimumOutcome, minimumCandidate, quotes),
    );
  }

  for (let day = firstDay; day <= regulatoryCeiling; day += 1) {
    if (points.some((point) => Math.abs(point.day - day) <= EPSILON)) continue;
    const candidate: Portfolio = {
      ...portfolio,
      ...(mode === 'wam' ? { maxWam: day } : { maxWal: day }),
    };
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
    (portfolio.aum * currentDuration) / upper.postAum,
  );
  const lower = optimiseSubscription(withLimit(lowerBound), banks, quotes);
  if (lower.ok && lower.postYtm + yieldTolerance >= targetYtm) {
    return { ok: true, limit: lowerBound, result: lower };
  }

  let lowLimit = lowerBound;
  let highLimit = ceiling;
  for (let iteration = 0; iteration < 52; iteration += 1) {
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

export function number(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const normalizedValue = value === 0 ? 0 : value;
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
  }).format(normalizedValue);
}

export function percent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return `${number(value, digits)}%`;
}

export function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseBankLibrary(raw: string): BankTemplate[] | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;

    const ids = new Set<string>();
    const names = new Set<string>();
    const valid = value.filter((item): item is BankTemplate => {
      if (!item || typeof item !== 'object') return false;
      const bank = item as Record<string, unknown>;
      const name = typeof bank.name === 'string' ? bank.name.trim() : '';
      const normalizedName = name.toLocaleLowerCase('zh-CN');
      const isValid =
        typeof bank.id === 'string' &&
        bank.id.length > 0 &&
        name.length > 0 &&
        typeof bank.defaultLimitPct === 'number' &&
        Number.isFinite(bank.defaultLimitPct) &&
        bank.defaultLimitPct >= 0 &&
        bank.defaultLimitPct <= SFC_MAX_BANK_CONCENTRATION_PCT &&
        !ids.has(bank.id) &&
        !names.has(normalizedName);
      if (isValid) {
        ids.add(bank.id as string);
        names.add(normalizedName);
      }
      return isValid;
    });

    return valid.length ? valid : null;
  } catch {
    return null;
  }
}
