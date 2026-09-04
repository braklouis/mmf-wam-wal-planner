'use client';

import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Check,
  Landmark,
  Plus,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TradeMode = 'subscription' | 'redemption';

type Portfolio = {
  tradeMode: TradeMode;
  aum: number;
  ytm: number;
  wam: number;
  wal: number;
  transactionAmount: number;
  maxWam: number | null;
  maxWal: number | null;
};

type Bank = {
  id: string;
  templateId: string | null;
  name: string;
  currentExposure: number;
  limitPct: number;
};

type BankTemplate = {
  id: string;
  name: string;
  defaultLimitPct: number;
};

type AmountUnit = '元' | '万元' | '百万元' | '亿元';

type Quote = {
  id: string;
  name: string;
  bankId: string;
  wamDays: number | null;
  walDays: number;
  rate: number;
  cap: number;
};

type BankOutcome = Bank & {
  transactionChange: number;
  finalExposure: number;
  finalPct: number;
  remaining: number;
};

type BaseSuccessResult = {
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

type SubscriptionSuccessResult = BaseSuccessResult & {
  tradeMode: 'subscription';
  allocationYield: number;
  unallocated: number;
  allocations: Array<Quote & { amount: number }>;
};

type RedemptionSuccessResult = BaseSuccessResult & {
  tradeMode: 'redemption';
  redemptionRatio: number;
};

type SuccessResult = SubscriptionSuccessResult | RedemptionSuccessResult;

type FailureResult = {
  ok: false;
  tradeMode: TradeMode;
  messages: string[];
  postAum: number;
};

type ModelResult = SuccessResult | FailureResult;

type SubscriptionModelResult = SubscriptionSuccessResult | FailureResult;

type FrontierMode = 'wam' | 'wal';

type FrontierPoint = {
  day: number;
  ytm: number;
  wam: number;
  wal: number;
  unallocated: number;
  bindingConstraints: string[];
  isPlateauStart: boolean;
};

type ReverseYtmResult =
  | {
      ok: true;
      limit: number;
      result: SubscriptionSuccessResult;
    }
  | {
      ok: false;
      message: string;
    };

type WebModelContext = {
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

const initialPortfolio: Portfolio = {
  tradeMode: 'subscription',
  aum: 100,
  ytm: 2.5,
  wam: 30,
  wal: 50,
  transactionAmount: 20,
  maxWam: 32,
  maxWal: 60,
};

const initialBanks: Bank[] = [
  {
    id: 'today-bank-a',
    templateId: 'bank-a',
    name: '银行 A',
    currentExposure: 25,
    limitPct: 25,
  },
  {
    id: 'today-bank-b',
    templateId: 'bank-b',
    name: '银行 B',
    currentExposure: 10,
    limitPct: 25,
  },
  {
    id: 'today-bank-c',
    templateId: 'bank-c',
    name: '金融机构 C',
    currentExposure: 5,
    limitPct: 10,
  },
];

const initialBankLibrary: BankTemplate[] = [
  { id: 'bank-a', name: '银行 A', defaultLimitPct: 25 },
  { id: 'bank-b', name: '银行 B', defaultLimitPct: 25 },
  { id: 'bank-c', name: '金融机构 C', defaultLimitPct: 10 },
  { id: 'bank-d', name: '银行 D', defaultLimitPct: 10 },
  { id: 'bank-e', name: '银行 E', defaultLimitPct: 10 },
];

const BANK_LIBRARY_STORAGE_KEY = 'mmf-planner.bank-library.v1';

const initialQuotes: Quote[] = [
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

const EPSILON = 1e-8;
const SFC_MAX_WAM_DAYS = 60;
const SFC_MAX_WAL_DAYS = 120;
const SFC_MAX_BANK_CONCENTRATION_PCT = 25;

function termValueError(
  value: number | null,
  metric: 'WAM' | 'WAL',
  optional = false,
) {
  if (value === null) return optional ? null : `${metric} 不能为空。`;
  if (!Number.isFinite(value)) return `${metric} 必须是有效数字。`;
  if (value < 0) return `${metric} 不得小于 0 天。`;
  return null;
}

function regulatoryTermError(
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

function currentTermComplianceWarning(
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

function bankConcentrationError(value: number) {
  if (!Number.isFinite(value)) return '集中度上限必须是有效数字。';
  if (value < 0) return '集中度上限不得低于 0%。';
  if (value > SFC_MAX_BANK_CONCENTRATION_PCT) {
    return 'SFC 对单一实体的最高例外上限为 25%；一般上限仍为 10%。';
  }
  return null;
}

function bankConcentrationNotice(value: number) {
  if (
    !Number.isFinite(value) ||
    value <= 10 ||
    value > SFC_MAX_BANK_CONCENTRATION_PCT
  ) {
    return null;
  }
  return '超过一般 10% 上限：仅适用于经合规确认符合 SFC 8.2(g)(i) 条件的实质金融机构。';
}

function quoteWamDays(quote: Quote) {
  return quote.wamDays ?? quote.walDays;
}

function postAumOf(portfolio: Portfolio) {
  const direction = portfolio.tradeMode === 'subscription' ? 1 : -1;
  return portfolio.aum + direction * portfolio.transactionAmount;
}

function postTradeExistingExposure(
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

function institutionExposureTotalError(portfolio: Portfolio, banks: Bank[]) {
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
  if (totalExposure > portfolio.aum + EPSILON) {
    return `已录入机构的当前持仓合计（${number(totalExposure)}）不得超过当前 AUM（${number(portfolio.aum)}）。`;
  }
  return null;
}

// Primal simplex for max c'x subject to Ax <= b, x >= 0.
// All planner constraints have a non-negative right-hand side, so the slack
// variables provide an immediate feasible starting point.
function simplex(
  objective: number[],
  matrix: number[][],
  limits: number[],
): number[] | null {
  const n = objective.length;
  const m = matrix.length;
  if (n === 0) return [];

  const width = n + m + 1;
  const height = m + 1;
  const t = Array.from({ length: height }, () => Array(width).fill(0));
  const basis = Array.from({ length: m }, (_, i) => n + i);

  for (let row = 0; row < m; row += 1) {
    for (let col = 0; col < n; col += 1) t[row][col] = matrix[row][col];
    t[row][n + row] = 1;
    t[row][width - 1] = limits[row];
  }
  for (let col = 0; col < n; col += 1) t[m][col] = -objective[col];

  for (let iteration = 0; iteration < 2000; iteration += 1) {
    let enter = -1;
    for (let col = 0; col < width - 1; col += 1) {
      if (t[m][col] < -EPSILON) {
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
      if (t[row][enter] <= EPSILON) continue;
      const candidate = t[row][width - 1] / t[row][enter];
      if (
        candidate < ratio - EPSILON ||
        (Math.abs(candidate - ratio) <= EPSILON &&
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
      if (row === leave || Math.abs(t[row][enter]) <= EPSILON) continue;
      const factor = t[row][enter];
      for (let col = 0; col < width; col += 1) {
        t[row][col] -= factor * t[leave][col];
      }
    }
    basis[leave] = enter;
  }
  return null;
}

function optimiseSubscription(
  portfolio: Portfolio,
  banks: Bank[],
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
  if (postAum <= 0) errors.push('交易后 AUM 必须大于 0。');
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
    if (bank.currentExposure > (postAum * bank.limitPct) / 100 + EPSILON) {
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
  const wamBudget = postAum * effectiveMaxWam - portfolio.aum * portfolio.wam;
  const walBudget = postAum * effectiveMaxWal - portfolio.aum * portfolio.wal;
  if (wamBudget < -EPSILON) {
    errors.push('即使新增资金全部留作现金，也无法满足 WAM 上限。');
  }
  if (walBudget < -EPSILON) {
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
  limits.push(portfolio.transactionAmount);

  matrix.push(quotes.map(quoteWamDays));
  limits.push(Math.max(0, wamBudget));
  matrix.push(quotes.map((quote) => quote.walDays));
  limits.push(Math.max(0, walBudget));
  banks.forEach((bank) => {
    matrix.push(quotes.map((quote) => (quote.bankId === bank.id ? 1 : 0)));
    limits.push(
      Math.max(0, (postAum * bank.limitPct) / 100 - bank.currentExposure),
    );
  });
  quotes.forEach((quote, quoteIndex) => {
    matrix.push(quotes.map((_, index) => (index === quoteIndex ? 1 : 0)));
    limits.push(Math.min(portfolio.transactionAmount, quote.cap));
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

  const allocation = raw.map((value) =>
    Math.abs(value) < EPSILON ? 0 : value,
  );
  const invested = allocation.reduce((sum, value) => sum + value, 0);
  const interest = allocation.reduce(
    (sum, value, index) => sum + value * quotes[index].rate,
    0,
  );
  const wamDuration = allocation.reduce(
    (sum, value, index) => sum + value * quoteWamDays(quotes[index]),
    0,
  );
  const walDuration = allocation.reduce(
    (sum, value, index) => sum + value * quotes[index].walDays,
    0,
  );

  return {
    ok: true,
    tradeMode: 'subscription',
    postAum,
    transactionAmount: portfolio.transactionAmount,
    appliedMaxWam: effectiveMaxWam,
    appliedMaxWal: effectiveMaxWal,
    postYtm: (portfolio.aum * portfolio.ytm + interest) / postAum,
    postWam: (portfolio.aum * portfolio.wam + wamDuration) / postAum,
    postWal: (portfolio.aum * portfolio.wal + walDuration) / postAum,
    allocationYield:
      portfolio.transactionAmount > 0
        ? interest / portfolio.transactionAmount
        : 0,
    unallocated: Math.max(0, portfolio.transactionAmount - invested),
    allocations: quotes
      .map((quote, index) => ({ ...quote, amount: allocation[index] }))
      .filter((quote) => quote.amount > EPSILON),
    banks: banks.map((bank) => {
      const transactionChange = allocation.reduce(
        (sum, value, index) =>
          sum + (quotes[index].bankId === bank.id ? value : 0),
        0,
      );
      const finalExposure = bank.currentExposure + transactionChange;
      const finalCap = (postAum * bank.limitPct) / 100;
      return {
        ...bank,
        transactionChange,
        finalExposure,
        finalPct: (finalExposure / postAum) * 100,
        remaining: Math.max(0, finalCap - finalExposure),
      };
    }),
  };
}

function calculateProRataRedemption(
  portfolio: Portfolio,
  banks: Bank[],
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
      bank.currentExposure > (portfolio.aum * bank.limitPct) / 100 + EPSILON
    ) {
      errors.push(
        `${bank.name || '某机构'}当前占比超过适用上限；同比例赎回后占比不变，无法修复该超限。`,
      );
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

  const remainingFactor = postAum / portfolio.aum;
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
    banks: banks.map((bank) => {
      const finalExposure = bank.currentExposure * remainingFactor;
      const finalCap = (postAum * bank.limitPct) / 100;
      return {
        ...bank,
        transactionChange: finalExposure - bank.currentExposure,
        finalExposure,
        finalPct: (finalExposure / postAum) * 100,
        remaining: Math.max(0, finalCap - finalExposure),
      };
    }),
  };
}

function calculatePlan(
  portfolio: Portfolio,
  banks: Bank[],
  quotes: Quote[],
): ModelResult {
  return portfolio.tradeMode === 'redemption'
    ? calculateProRataRedemption(portfolio, banks)
    : optimiseSubscription(portfolio, banks, quotes);
}

function describeBindingConstraints(
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

function makeFrontierPoint(
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

function buildFrontier(
  mode: FrontierMode,
  portfolio: Portfolio,
  banks: Bank[],
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

function solveTargetYtm(
  mode: FrontierMode,
  targetYtm: number,
  portfolio: Portfolio,
  banks: Bank[],
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

function number(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
  }).format(value);
}

function percent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return `${number(value, digits)}%`;
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseBankLibrary(raw: string): BankTemplate[] | null {
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

const decimalDraftPattern = /^-?(?:\d+\.?\d*|\.\d*)?$/;

function numericDraft(value: number | null) {
  return value === null || !Number.isFinite(value) ? '' : String(value);
}

function parseNumericDraft(value: string) {
  if (value === '' || value === '-' || value === '.' || value === '-.') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type EditableNumberInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'value' | 'onChange'
> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
};

function EditableNumberInput({
  value,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: EditableNumberInputProps) {
  const [draft, setDraft] = useState(() => numericDraft(value));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setDraft(numericDraft(value));
  }, [value]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      onFocus={(event) => {
        editing.current = true;
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value.replace(/[，,]/g, '.');
        if (!decimalDraftPattern.test(next)) return;
        setDraft(next);
        onValueChange(parseNumericDraft(next));
      }}
      onBlur={(event) => {
        editing.current = false;
        const parsed = parseNumericDraft(draft);
        setDraft(parsed === null ? '' : String(parsed));
        onValueChange(parsed);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        onKeyDown?.(event);
      }}
    />
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
  optional,
  min,
  max,
  error,
  warning,
  warningTone = 'yellow',
}: {
  label: string;
  value: number | null;
  suffix: string;
  onChange: (value: number | null) => void;
  optional?: boolean;
  min?: number;
  max?: number;
  error?: string | null;
  warning?: string | null;
  warningTone?: 'yellow' | 'red';
}) {
  const fallbackError =
    value === null
      ? optional
        ? null
        : `${label}不能为空。`
      : !Number.isFinite(value)
        ? `${label}必须是有效数字。`
        : null;
  const validationError = error ?? fallbackError;
  const isRed = Boolean(validationError || (warning && warningTone === 'red'));
  const isYellow = Boolean(warning && warningTone === 'yellow' && !isRed);

  return (
    <label
      className={`grid gap-1.5 rounded-xl border p-2 ${
        isRed
          ? 'border-red-300 bg-red-50'
          : isYellow
            ? 'border-yellow-300 bg-yellow-100/80'
            : 'border-transparent'
      }`}
    >
      <span className="flex justify-between text-sm font-medium text-slate-700">
        {label}
        {optional ? (
          <span className="text-xs font-normal text-slate-400">可留空</span>
        ) : null}
      </span>
      <span className="relative">
        <EditableNumberInput
          min={min}
          max={max}
          step="0.01"
          value={value}
          onValueChange={onChange}
          aria-invalid={validationError ? true : undefined}
          className={`h-10 rounded-xl pr-12 text-base ${
            isRed
              ? 'border-red-300 bg-red-50 text-red-950 focus-visible:border-red-500 focus-visible:ring-red-500/15'
              : isYellow
                ? 'border-yellow-300 bg-yellow-50 text-slate-950 focus-visible:border-yellow-500 focus-visible:ring-yellow-500/15'
                : 'border-slate-200 bg-white focus-visible:border-teal-600 focus-visible:ring-teal-600/15'
          }`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
          {suffix}
        </span>
      </span>
      {validationError ? (
        <span role="alert" className="text-xs font-medium text-red-600">
          {validationError}
        </span>
      ) : warning ? (
        <span
          aria-live="polite"
          className={`text-xs font-medium ${
            warningTone === 'red' ? 'text-red-700' : 'text-yellow-800'
          }`}
        >
          {warning}
        </span>
      ) : null}
    </label>
  );
}

function Metric({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-teal-200 bg-teal-50/80'
          : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

const frontierChartConfig = {
  ytm: {
    label: '最高 YTM',
    color: '#0d9488',
  },
} satisfies ChartConfig;

function FrontierPanel({
  mode,
  points,
  currentLimit,
  otherLimit,
  onSelect,
  targetYtm,
  targetYtmError,
  targetYtmMessage,
  onTargetYtmChange,
  onSolveTarget,
  disabled,
}: {
  mode: FrontierMode;
  points: FrontierPoint[];
  currentLimit: number | null;
  otherLimit: number | null;
  onSelect: (day: number) => void;
  targetYtm: number | null;
  targetYtmError: string | null;
  targetYtmMessage: string | null;
  onTargetYtmChange: (value: number | null) => void;
  onSolveTarget: () => void;
  disabled?: boolean;
}) {
  const label = mode.toUpperCase();
  const targetControl = (
    <form
      className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSolveTarget();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor="target-ytm" className="min-w-44 flex-1">
          <span className="mb-1.5 block text-sm font-semibold text-slate-800">
            目标交易后 YTM
          </span>
          <span className="relative block">
            <EditableNumberInput
              id="target-ytm"
              aria-label="目标交易后YTM百分比"
              aria-invalid={targetYtmError ? true : undefined}
              value={targetYtm}
              step="0.001"
              disabled={disabled}
              placeholder="例如 3.000"
              onValueChange={onTargetYtmChange}
              className={`h-10 rounded-xl pr-9 text-base ${
                targetYtmError
                  ? 'border-red-300 bg-red-50 text-red-950'
                  : 'border-teal-200 bg-white focus-visible:border-teal-600 focus-visible:ring-teal-600/15'
              }`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
              %
            </span>
          </span>
        </label>
        <Button
          type="submit"
          disabled={disabled || targetYtm === null}
          className="bg-teal-600 text-white hover:bg-teal-700"
        >
          反推期限与配置比例 <ArrowRight />
        </Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        目标按“至少达到”处理；系统反推所选 {label}{' '}
        的最短上限和产品比例，另一项当前上限及 SFC 硬上限继续生效。
      </p>
      {targetYtmError ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {targetYtmError}
        </p>
      ) : targetYtmMessage ? (
        <p
          aria-live="polite"
          className="mt-2 text-xs font-medium text-teal-800"
        >
          {targetYtmMessage}
        </p>
      ) : null}
    </form>
  );

  if (!points.length) {
    return (
      <div className="p-5">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            当前组合在 SFC 的 {label}{' '}
            区间内没有可行点，请先放宽另一项期限约束或检查输入。
          </AlertTitle>
        </Alert>
        {targetControl}
      </div>
    );
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const gainBps = Math.max(0, (last.ytm - first.ytm) * 100);
  const plateau = points.find((point) => point.isPlateauStart) ?? last;
  const hasPlateau = plateau.day < last.day - 0.001;
  const plateauReasons = plateau.bindingConstraints.filter(
    (constraint) => !constraint.startsWith(label),
  );
  const plateauReasonText = plateauReasons.length
    ? plateauReasons.join('、')
    : '当前可投报价本身的收益上限';

  return (
    <div className="grid gap-5 p-5">
      <div className="min-w-0">
        <ChartContainer
          config={frontierChartConfig}
          className="h-[290px] w-full cursor-crosshair aspect-auto"
          initialDimension={{ width: 760, height: 290 }}
        >
          <LineChart
            data={points}
            margin={{ top: 12, right: 18, bottom: 8, left: 4 }}
            onClick={(state) => {
              const day = Number(state?.activeLabel);
              if (Number.isFinite(day)) onSelect(day);
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="day"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickCount={7}
              unit="天"
            />
            <YAxis
              dataKey="ytm"
              type="number"
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={58}
              tickFormatter={(value) => `${Number(value).toFixed(2)}%`}
            />
            <ChartTooltip
              cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => (
                    <div className="grid min-w-36 gap-1">
                      <span className="text-slate-500">
                        {label} 上限 {number(item.payload.day)} 天
                      </span>
                      <span className="font-semibold text-slate-950">
                        最高 YTM {percent(Number(value), 3)}
                      </span>
                      <span className="text-slate-500">
                        实际 WAM {number(item.payload.wam)} 天 · WAL{' '}
                        {number(item.payload.wal)} 天
                      </span>
                      <span className="text-teal-700">
                        较最紧点 +
                        {number((item.payload.ytm - first.ytm) * 100, 1)} bp
                      </span>
                      {item.payload.bindingConstraints?.length ? (
                        <span className="max-w-56 text-slate-500">
                          约束：{item.payload.bindingConstraints.join('、')}
                        </span>
                      ) : null}
                    </div>
                  )}
                />
              }
            />
            {currentLimit !== null ? (
              <ReferenceLine
                x={currentLimit}
                ifOverflow="extendDomain"
                stroke="#f59e0b"
                strokeDasharray="5 4"
                label={{
                  value: '当前选择',
                  position: 'insideTopRight',
                  fill: '#b45309',
                  fontSize: 12,
                }}
              />
            ) : null}
            {hasPlateau ? (
              <ReferenceLine
                x={plateau.day}
                stroke="#64748b"
                strokeDasharray="3 4"
              />
            ) : null}
            {targetYtm !== null &&
            Number.isFinite(targetYtm) &&
            targetYtm >= first.ytm - 0.0001 &&
            targetYtm <= last.ytm + 0.0001 ? (
              <ReferenceLine
                y={targetYtm}
                stroke="#0f766e"
                strokeDasharray="3 4"
                label={{
                  value: '目标 YTM',
                  position: 'insideBottomLeft',
                  fill: '#0f766e',
                  fontSize: 12,
                }}
              />
            ) : null}
            <Line
              dataKey="ytm"
              type="linear"
              stroke="var(--color-ytm)"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#0d9488',
                stroke: '#ffffff',
                strokeWidth: 3,
              }}
            />
            {hasPlateau ? (
              <ReferenceDot
                x={plateau.day}
                y={plateau.ytm}
                r={5}
                fill="#ffffff"
                stroke="#0d9488"
                strokeWidth={3}
              />
            ) : null}
          </LineChart>
        </ChartContainer>
        {hasPlateau ? (
          <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-teal-700">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-teal-600"
            />
            <span>
              坐标（{number(plateau.day)} 天，{percent(plateau.ytm, 3)}）· 最大
              YTM
            </span>
          </p>
        ) : null}
        <p className="mt-1 text-center text-xs text-slate-400">
          点击曲线上的位置，即可采用对应的 {label} 上限并重新计算
        </p>
        {targetControl}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          曲线读法
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {mode === 'wam'
            ? 'WAM 衡量利率重定价敏感度；浮息工具可使用较短的获认可重定价天数，但仍会消耗 WAL。'
            : 'WAL 按最终本金到期计量；利率重定价不会在本模型中缩短 WAL。'}
        </p>
        <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            {hasPlateau ? '为什么之后不再增加？' : '尚未达到最大 YTM'}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {hasPlateau ? (
              <>
                按当前数值精度，约 {number(plateau.day)} 天起，最优配置的实际{' '}
                {label} 已固定在{' '}
                {number(mode === 'wam' ? plateau.wam : plateau.wal)}{' '}
                天。继续提高 {label}{' '}
                上限只会增加未使用的期限空间，并不会找到更高收益的合规配置。最大
                YTM 配置触及的其他边界包括：
                {plateauReasonText}。
              </>
            ) : (
              <>
                在当前展示区间内，放宽 {label} 仍能提高最高收益，尚未达到最大
                YTM；曲线止于 SFC {label} ≤{' '}
                {mode === 'wam' ? SFC_MAX_WAM_DAYS : SFC_MAX_WAL_DAYS}{' '}
                天的硬上限。
              </>
            )}
          </p>
        </div>
        <dl className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">展示区间</dt>
            <dd className="font-medium">
              {first.day}–{last.day} 天
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">区间收益差</dt>
            <dd className="font-medium text-teal-700">
              +{number(gainBps, 1)} bp
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">最大 YTM 起点</dt>
            <dd className="font-medium">
              {hasPlateau
                ? `数值精度内约 ${number(plateau.day)} 天起`
                : '展示区间内未达到'}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">另一约束</dt>
            <dd className="text-right font-medium">
              {mode === 'wam' ? 'WAL' : 'WAM'}{' '}
              {otherLimit === null
                ? `仅 SFC ≤ ${mode === 'wam' ? SFC_MAX_WAL_DAYS : SFC_MAX_WAM_DAYS} 天`
                : `≤ ${number(otherLimit)} 天`}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

const card =
  'rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]';

export default function Home() {
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [banks, setBanks] = useState(initialBanks);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [bankLibrary, setBankLibrary] = useState(initialBankLibrary);
  const [bankLibraryLoaded, setBankLibraryLoaded] = useState(false);
  const [selectedBankTemplateId, setSelectedBankTemplateId] =
    useState('bank-d');
  const [newBankName, setNewBankName] = useState('');
  const [newBankLimitPct, setNewBankLimitPct] = useState(10);
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('百万元');
  const [result, setResult] = useState<ModelResult>(() =>
    calculatePlan(initialPortfolio, initialBanks, initialQuotes),
  );
  const [dirty, setDirty] = useState(false);
  const [frontierMode, setFrontierMode] = useState<FrontierMode>('wam');
  const [targetYtm, setTargetYtm] = useState<number | null>(null);
  const [targetYtmError, setTargetYtmError] = useState<string | null>(null);
  const [targetYtmMessage, setTargetYtmMessage] = useState<string | null>(null);
  const stateRef = useRef({ portfolio, banks, quotes });

  useEffect(() => {
    stateRef.current = { portfolio, banks, quotes };
  }, [portfolio, banks, quotes]);

  useEffect(() => {
    let cancelled = false;
    let parsed: BankTemplate[] | null = null;
    try {
      const saved = window.localStorage.getItem(BANK_LIBRARY_STORAGE_KEY);
      parsed = saved ? parseBankLibrary(saved) : null;
    } catch {
      // The default library is used when browser storage is unavailable.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      if (parsed) setBankLibrary(parsed);
      setBankLibraryLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bankLibraryLoaded) return;
    try {
      window.localStorage.setItem(
        BANK_LIBRARY_STORAGE_KEY,
        JSON.stringify(bankLibrary),
      );
    } catch {
      // The planner remains usable when browser storage is unavailable.
    }
  }, [bankLibrary, bankLibraryLoaded]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebModelContext })
      .modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: 'calculate_current_mmf_allocation',
        title: '计算当前 MMF 配置',
        description:
          '使用页面当前填写的组合、机构敞口、交易方向和报价，计算申购配置或同比例赎回影响。',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: {
          readOnlyHint: false,
          untrustedContentHint: false,
        },
        execute() {
          const current = stateRef.current;
          const nextResult = calculatePlan(
            current.portfolio,
            current.banks,
            current.quotes,
          );
          setResult(nextResult);
          setDirty(false);
          if (!nextResult.ok) {
            return {
              ok: false,
              tradeMode: nextResult.tradeMode,
              postAum: nextResult.postAum,
              messages: nextResult.messages,
            };
          }
          if (nextResult.tradeMode === 'redemption') {
            return {
              ok: true,
              tradeMode: nextResult.tradeMode,
              transactionAmount: nextResult.transactionAmount,
              redemptionPct: nextResult.redemptionRatio * 100,
              postAum: nextResult.postAum,
              postYtm: nextResult.postYtm,
              postWam: nextResult.postWam,
              postWal: nextResult.postWal,
              institutions: nextResult.banks.map((bank) => ({
                institution: bank.name,
                redeemed: Math.abs(bank.transactionChange),
                finalExposure: bank.finalExposure,
                finalPct: bank.finalPct,
              })),
            };
          }
          return {
            ok: true,
            tradeMode: nextResult.tradeMode,
            transactionAmount: nextResult.transactionAmount,
            postAum: nextResult.postAum,
            postYtm: nextResult.postYtm,
            postWam: nextResult.postWam,
            postWal: nextResult.postWal,
            unallocated: nextResult.unallocated,
            allocations: nextResult.allocations.map((item) => ({
              product: item.name,
              amount: item.amount,
              rate: item.rate,
              wamDays: quoteWamDays(item),
              walDays: item.walDays,
            })),
          };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => {});
    return () => lifecycle.abort();
  }, []);

  const isRedemption = portfolio.tradeMode === 'redemption';
  const postAum = postAumOf(portfolio);
  const aumInputError = !Number.isFinite(portfolio.aum)
    ? '当前 AUM 必须是有效数字。'
    : isRedemption && portfolio.aum <= 0
      ? '净赎回时，当前 AUM 必须大于 0。'
      : portfolio.aum < 0
        ? '当前 AUM 不得小于 0。'
        : null;
  const transactionAmountError = !Number.isFinite(portfolio.transactionAmount)
    ? `${isRedemption ? '净赎回金额' : '新增待配置资金'}必须是有效数字。`
    : portfolio.transactionAmount < 0
      ? `${isRedemption ? '净赎回金额' : '新增待配置资金'}不得小于 0。`
      : isRedemption &&
          Number.isFinite(portfolio.aum) &&
          portfolio.transactionAmount >= portfolio.aum
        ? '净赎回金额必须小于当前 AUM；全部赎回后无法计算组合指标。'
        : null;
  const currentWamValueError = termValueError(portfolio.wam, 'WAM');
  const currentWalValueError = termValueError(portfolio.wal, 'WAL');
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
  const currentWamInputError =
    currentWamValueError ??
    (isRedemption &&
    !maxWamError &&
    portfolio.wam >
      Math.min(portfolio.maxWam ?? SFC_MAX_WAM_DAYS, SFC_MAX_WAM_DAYS) + EPSILON
      ? '同比例赎回不会改变 WAM；当前值仍高于交易后上限。'
      : null);
  const currentWalInputError =
    currentWalValueError ??
    (isRedemption &&
    !maxWalError &&
    portfolio.wal >
      Math.min(portfolio.maxWal ?? SFC_MAX_WAL_DAYS, SFC_MAX_WAL_DAYS) + EPSILON
      ? '同比例赎回不会改变 WAL；当前值仍高于交易后上限。'
      : null);
  const currentWamWarning = currentTermComplianceWarning(
    portfolio.wam,
    'WAM',
    SFC_MAX_WAM_DAYS,
    portfolio.tradeMode,
  );
  const currentWalWarning = currentTermComplianceWarning(
    portfolio.wal,
    'WAL',
    SFC_MAX_WAL_DAYS,
    portfolio.tradeMode,
  );
  const newBankLimitError = bankConcentrationError(newBankLimitPct);
  const newBankLimitNotice = bankConcentrationNotice(newBankLimitPct);
  const bankExposureInvalidIds = new Set(
    banks
      .filter(
        (bank) =>
          !Number.isFinite(bank.currentExposure) || bank.currentExposure < 0,
      )
      .map((bank) => bank.id),
  );
  const currentBankExposureBreachIds = new Set(
    banks
      .filter(
        (bank) =>
          Number.isFinite(portfolio.aum) &&
          portfolio.aum > 0 &&
          !bankConcentrationError(bank.limitPct) &&
          Number.isFinite(bank.currentExposure) &&
          bank.currentExposure >
            (portfolio.aum * bank.limitPct) / 100 + EPSILON,
      )
      .map((bank) => bank.id),
  );
  const bankExposureBreachIds = isRedemption
    ? currentBankExposureBreachIds
    : new Set(
        banks
          .filter(
            (bank) =>
              Number.isFinite(postAum) &&
              postAum > 0 &&
              !bankConcentrationError(bank.limitPct) &&
              Number.isFinite(bank.currentExposure) &&
              postTradeExistingExposure(portfolio, bank.currentExposure) >
                (postAum * bank.limitPct) / 100 + EPSILON,
          )
          .map((bank) => bank.id),
      );
  const bankExposureTotalError = institutionExposureTotalError(
    portfolio,
    banks,
  );
  const hasRegulatoryLimitViolation = Boolean(
    currentWamInputError ||
    currentWalInputError ||
    aumInputError ||
    transactionAmountError ||
    maxWamError ||
    maxWalError ||
    banks.some((bank) => bankConcentrationError(bank.limitPct)) ||
    bankExposureInvalidIds.size ||
    bankExposureBreachIds.size ||
    bankExposureTotalError,
  );
  const availableBankTemplates = useMemo(
    () =>
      bankLibrary.filter(
        (template) => !banks.some((bank) => bank.templateId === template.id),
      ),
    [bankLibrary, banks],
  );
  const bankNames = useMemo(
    () => new Map(banks.map((bank) => [bank.id, bank.name])),
    [banks],
  );
  const frontiers = useMemo(
    () =>
      isRedemption
        ? { wam: [], wal: [] }
        : {
            wam: buildFrontier('wam', portfolio, banks, quotes),
            wal: buildFrontier('wal', portfolio, banks, quotes),
          },
    [portfolio, banks, quotes, isRedemption],
  );
  const clearTargetOutcome = () => {
    setTargetYtmError(null);
    setTargetYtmMessage(null);
  };
  const updatePortfolio = <K extends keyof Portfolio>(
    key: K,
    value: Portfolio[K],
  ) => {
    setPortfolio((old) => ({ ...old, [key]: value }));
    setDirty(true);
    clearTargetOutcome();
  };
  const updateBank = (bankId: string, patch: Partial<Bank>) => {
    setBanks((old) =>
      old.map((bank) => (bank.id === bankId ? { ...bank, ...patch } : bank)),
    );
    setDirty(true);
    clearTargetOutcome();
  };
  const updateQuote = (quoteId: string, patch: Partial<Quote>) => {
    setQuotes((old) =>
      old.map((quote) =>
        quote.id === quoteId ? { ...quote, ...patch } : quote,
      ),
    );
    setDirty(true);
    clearTargetOutcome();
  };
  const addBankFromLibrary = () => {
    const template = availableBankTemplates.find(
      (bank) => bank.id === selectedBankTemplateId,
    );
    if (!template) return;
    setBanks((old) => [
      ...old,
      {
        id: id('today-bank'),
        templateId: template.id,
        name: template.name,
        currentExposure: 0,
        limitPct: template.defaultLimitPct,
      },
    ]);
    setSelectedBankTemplateId('');
    setDirty(true);
    clearTargetOutcome();
  };
  const saveBankToLibrary = () => {
    const name = newBankName.trim();
    if (
      !name ||
      !Number.isFinite(newBankLimitPct) ||
      newBankLimitPct < 0 ||
      newBankLimitPct > SFC_MAX_BANK_CONCENTRATION_PCT
    ) {
      return;
    }

    const existing = bankLibrary.find(
      (bank) =>
        bank.name.toLocaleLowerCase('zh-CN') ===
        name.toLocaleLowerCase('zh-CN'),
    );
    if (existing) {
      setSelectedBankTemplateId(existing.id);
      setNewBankName('');
      return;
    }

    const template: BankTemplate = {
      id: id('bank-template'),
      name,
      defaultLimitPct: newBankLimitPct,
    };
    setBankLibrary((old) => [...old, template]);
    setSelectedBankTemplateId(template.id);
    setNewBankName('');
  };
  const calculate = () => {
    setResult(calculatePlan(portfolio, banks, quotes));
    setDirty(false);
    clearTargetOutcome();
  };
  const changeTradeMode = (tradeMode: TradeMode) => {
    const nextPortfolio = { ...portfolio, tradeMode };
    setPortfolio(nextPortfolio);
    setResult(calculatePlan(nextPortfolio, banks, quotes));
    setDirty(false);
    setTargetYtm(null);
    clearTargetOutcome();
  };
  const reset = () => {
    setPortfolio(initialPortfolio);
    setBanks(initialBanks);
    setQuotes(initialQuotes);
    setResult(calculatePlan(initialPortfolio, initialBanks, initialQuotes));
    setDirty(false);
    setTargetYtm(null);
    setTargetYtmError(null);
    setTargetYtmMessage(null);
  };
  const selectFrontierDay = (mode: FrontierMode, day: number) => {
    if (isRedemption) return;
    const nextPortfolio = {
      ...portfolio,
      ...(mode === 'wam' ? { maxWam: day } : { maxWal: day }),
    };
    setPortfolio(nextPortfolio);
    setResult(optimiseSubscription(nextPortfolio, banks, quotes));
    setDirty(false);
    clearTargetOutcome();
  };
  const reverseTargetYtm = () => {
    if (isRedemption) return;
    if (targetYtm === null || !Number.isFinite(targetYtm)) {
      setTargetYtmError('请输入有效的目标 YTM。');
      setTargetYtmMessage(null);
      return;
    }

    const solution = solveTargetYtm(
      frontierMode,
      targetYtm,
      portfolio,
      banks,
      quotes,
    );
    if (!solution.ok) {
      setTargetYtmError(solution.message);
      setTargetYtmMessage(null);
      return;
    }

    const nextPortfolio: Portfolio = {
      ...portfolio,
      ...(frontierMode === 'wam'
        ? { maxWam: solution.limit }
        : { maxWal: solution.limit }),
    };
    setPortfolio(nextPortfolio);
    setResult(solution.result);
    setDirty(false);
    setTargetYtmError(null);
    setTargetYtmMessage(
      `目标 ≥ ${percent(targetYtm, 3)}；最低 ${frontierMode.toUpperCase()} 上限 ${number(solution.limit)} 天；本解 ${percent(solution.result.postYtm, 3)}。推荐金额与比例已同步更新。`,
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-800 bg-[#0b2431] text-white">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-teal-400 text-slate-950">
              <Calculator className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  MMF 配置台
                </h1>
                <Badge className="border border-white/10 bg-white/10 text-teal-100">
                  本地草案
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-slate-300">
                {isRedemption
                  ? '测算同比例赎回后的组合与机构敞口'
                  : '在期限与机构集中度约束内，寻找最高收益配置'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 px-3 py-1.5">
              WAM 利率敏感度 · WAL 最终到期
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">
              金额字段 = 绝对金额 · % 字段 = 占比
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1540px] gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(560px,0.85fr)] lg:px-8">
        <div className="space-y-5">
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="eyebrow">01 · 组合参数</p>
                <h2 className="mt-1 text-lg font-semibold">当前组合与目标</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  统一金额单位
                  <NativeSelect
                    aria-label="统一金额单位"
                    size="sm"
                    value={amountUnit}
                    onChange={(event) =>
                      setAmountUnit(event.target.value as AmountUnit)
                    }
                    className="w-24"
                  >
                    {(['元', '万元', '百万元', '亿元'] as const).map((unit) => (
                      <NativeSelectOption value={unit} key={unit}>
                        {unit}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>
                <Badge variant="outline">
                  交易后 AUM {number(postAum)} {amountUnit}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  今日资金方向
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isRedemption
                    ? '第一版按当前组合所有资产同比例赎回'
                    : '将新增资金配置到今日可投产品'}
                </p>
              </div>
              <fieldset className="grid w-full grid-cols-2 rounded-xl bg-slate-200/70 p-1 sm:w-auto">
                <legend className="sr-only">选择今日资金方向</legend>
                {(
                  [
                    ['subscription', '净申购'],
                    ['redemption', '净赎回'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={portfolio.tradeMode === mode}
                    onClick={() => changeTradeMode(mode)}
                    className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                      portfolio.tradeMode === mode
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </fieldset>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                label="当前 AUM（绝对金额）"
                value={portfolio.aum}
                suffix={amountUnit}
                min={0}
                error={aumInputError}
                onChange={(value) =>
                  updatePortfolio('aum', value ?? Number.NaN)
                }
              />
              <NumberField
                label={
                  isRedemption
                    ? '净赎回金额（绝对金额）'
                    : '新增待配置资金（绝对金额）'
                }
                value={portfolio.transactionAmount}
                suffix={amountUnit}
                min={0}
                max={
                  isRedemption && Number.isFinite(portfolio.aum)
                    ? Math.max(0, portfolio.aum - EPSILON)
                    : undefined
                }
                error={transactionAmountError}
                onChange={(value) =>
                  updatePortfolio('transactionAmount', value ?? Number.NaN)
                }
              />
              <NumberField
                label="当前 YTM"
                value={portfolio.ytm}
                suffix="%"
                onChange={(value) =>
                  updatePortfolio('ytm', value ?? Number.NaN)
                }
              />
              <NumberField
                label="当前 WAM"
                value={portfolio.wam}
                suffix="天"
                min={0}
                error={currentWamInputError}
                warning={currentWamWarning}
                warningTone="red"
                onChange={(value) =>
                  updatePortfolio('wam', value ?? Number.NaN)
                }
              />
              <NumberField
                label="当前 WAL"
                value={portfolio.wal}
                suffix="天"
                min={0}
                error={currentWalInputError}
                warning={currentWalWarning}
                warningTone="red"
                onChange={(value) =>
                  updatePortfolio('wal', value ?? Number.NaN)
                }
              />
              <NumberField
                label={isRedemption ? 'WAM 上限（合规检验）' : 'WAM 上限'}
                value={portfolio.maxWam}
                suffix="天"
                optional
                min={0}
                max={SFC_MAX_WAM_DAYS}
                error={maxWamError}
                onChange={(value) => updatePortfolio('maxWam', value)}
              />
              <NumberField
                label={isRedemption ? 'WAL 上限（合规检验）' : 'WAL 上限'}
                value={portfolio.maxWal}
                suffix="天"
                optional
                min={0}
                max={SFC_MAX_WAL_DAYS}
                error={maxWalError}
                onChange={(value) => updatePortfolio('maxWal', value)}
              />
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
              {isRedemption ? (
                <>
                  所有金额都填写绝对金额并使用同一单位。交易后 AUM = 当前 AUM −
                  净赎回金额。当前版本假设所有资产及机构敞口按相同比例缩减，因此
                  YTM、WAM、WAL 与机构占比保持不变；已有超限也不会被修复。
                </>
              ) : (
                <>
                  所有金额都填写绝对金额并使用同一单位。交易后 AUM = 当前 AUM +
                  新增待配置资金；新增资金尚未包含在当前 AUM 中。当前 WAM/WAL
                  是事实快照，超标时仍可录入以测算修复方案；目标留空时仍自动执行
                  SFC 监管上限 WAM 60 天、WAL 120 天。
                </>
              )}
            </p>
          </section>

          <section className={card}>
            <div className="section-head">
              <div>
                <p className="eyebrow">02 · 机构敞口</p>
                <h2 className="mt-1 text-lg font-semibold">
                  {isRedemption
                    ? '当前机构持仓与赎回后集中度'
                    : '今日参与机构与集中度额度'}
                </h2>
              </div>
              <Badge variant="outline">
                {isRedemption ? '当前' : '今日'} {banks.length} 家 · 备选库{' '}
                {bankLibrary.length} 家
              </Badge>
            </div>

            <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 p-5 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      合作机构备选库
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isRedemption
                        ? '选择后加入当前机构持仓名单'
                        : '选择后加入今天的敞口与报价名单'}
                    </p>
                  </div>
                  <Badge variant="secondary">仅保存在本机</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <NativeSelect
                    aria-label="从合作机构备选库选择"
                    value={
                      availableBankTemplates.some(
                        (bank) => bank.id === selectedBankTemplateId,
                      )
                        ? selectedBankTemplateId
                        : ''
                    }
                    onChange={(event) =>
                      setSelectedBankTemplateId(event.target.value)
                    }
                    className="min-w-0 flex-1"
                  >
                    <NativeSelectOption value="">
                      {availableBankTemplates.length
                        ? '选择备选机构'
                        : '备选机构已全部加入'}
                    </NativeSelectOption>
                    {availableBankTemplates.map((bank) => (
                      <NativeSelectOption value={bank.id} key={bank.id}>
                        {bank.name} · 默认 {number(bank.defaultLimitPct)}%
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !availableBankTemplates.some(
                        (bank) => bank.id === selectedBankTemplateId,
                      )
                    }
                    onClick={addBankFromLibrary}
                  >
                    <Plus /> {isRedemption ? '加入持仓' : '加入今日'}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">
                  新增合作机构
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                  <label htmlFor="new-bank-name" className="grid gap-1">
                    <span className="text-xs text-slate-500">机构名称</span>
                    <Input
                      id="new-bank-name"
                      aria-label="新增合作机构名称"
                      value={newBankName}
                      placeholder="例如：机构 F"
                      onChange={(event) => setNewBankName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveBankToLibrary();
                      }}
                    />
                  </label>
                  <label
                    htmlFor="new-bank-limit"
                    className={`grid gap-1 rounded-xl border p-2 ${
                      newBankLimitError
                        ? 'border-red-300 bg-red-50'
                        : newBankLimitNotice
                          ? 'border-yellow-300 bg-yellow-100/80'
                          : 'border-transparent'
                    }`}
                  >
                    <span className="text-xs text-slate-500">
                      默认上限（%）
                    </span>
                    <EditableNumberInput
                      id="new-bank-limit"
                      aria-label="新增合作机构默认集中度上限百分比"
                      value={newBankLimitPct}
                      min={0}
                      max={SFC_MAX_BANK_CONCENTRATION_PCT}
                      step="0.01"
                      onValueChange={(value) =>
                        setNewBankLimitPct(value ?? Number.NaN)
                      }
                      aria-invalid={newBankLimitError ? true : undefined}
                      className={`text-right ${
                        newBankLimitError
                          ? 'border-red-300 bg-red-50 text-red-950'
                          : newBankLimitNotice
                            ? 'border-yellow-300 bg-yellow-50 text-slate-950'
                            : ''
                      }`}
                    />
                    {newBankLimitError ? (
                      <span
                        role="alert"
                        className="text-xs font-medium leading-4 text-red-600"
                      >
                        {newBankLimitError}
                      </span>
                    ) : newBankLimitNotice ? (
                      <span className="text-xs font-medium leading-4 text-yellow-800">
                        {newBankLimitNotice}
                      </span>
                    ) : null}
                  </label>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        !newBankName.trim() ||
                        !Number.isFinite(newBankLimitPct) ||
                        newBankLimitPct < 0 ||
                        newBankLimitPct > SFC_MAX_BANK_CONCENTRATION_PCT
                      }
                      onClick={saveBankToLibrary}
                    >
                      存入备选库
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {bankExposureTotalError ? (
              <div className="border-b border-slate-100 px-5 py-4">
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertTitle>{bankExposureTotalError}</AlertTitle>
                </Alert>
              </div>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="pl-5">机构</TableHead>
                  <TableHead className="text-right">
                    当前持仓
                    <span className="block text-[11px] font-normal text-slate-400">
                      绝对金额/{amountUnit}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    {isRedemption ? '赎回后占比（不变）' : '当前占比'}
                    <span className="block text-[11px] font-normal text-slate-400">
                      {isRedemption ? '与当前占比相同' : '占当前 AUM'}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    适用集中度上限
                    <span className="block text-[11px] font-normal text-slate-400">
                      合规确认 · 占交易后 NAV/%
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    {isRedemption ? '赎回后持仓' : '交易后额度上限'}
                    <span className="block text-[11px] font-normal text-slate-400">
                      绝对金额/{amountUnit}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    {isRedemption ? '预计同比例赎回' : '本次最多可新增'}
                    <span className="block text-[11px] font-normal text-slate-400">
                      绝对金额/{amountUnit}
                    </span>
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.map((bank) => {
                  const concentrationError = bankConcentrationError(
                    bank.limitPct,
                  );
                  const concentrationNotice = bankConcentrationNotice(
                    bank.limitPct,
                  );
                  const finalCap = concentrationError
                    ? Number.NaN
                    : (postAum * bank.limitPct) / 100;
                  const postTradeExposure = postTradeExistingExposure(
                    portfolio,
                    bank.currentExposure,
                  );
                  const remaining = Math.max(0, finalCap - postTradeExposure);
                  const redeemed = Math.max(
                    0,
                    bank.currentExposure - postTradeExposure,
                  );
                  const hasQuotes = quotes.some(
                    (quote) => quote.bankId === bank.id,
                  );
                  const exposureInvalid = bankExposureInvalidIds.has(bank.id);
                  const postTradeExposureBreach = bankExposureBreachIds.has(
                    bank.id,
                  );
                  const currentExposureBreach =
                    currentBankExposureBreachIds.has(bank.id);
                  const exposureCellError =
                    exposureInvalid || postTradeExposureBreach;
                  const exposureHighlight =
                    exposureCellError || currentExposureBreach;
                  return (
                    <TableRow key={bank.id}>
                      <TableCell className="min-w-32 pl-5">
                        <p className="font-medium text-slate-800">
                          {bank.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {isRedemption ? '当前持仓名单' : '今日名单'}
                        </p>
                      </TableCell>
                      <TableCell
                        className={`min-w-28 align-top ${exposureHighlight ? 'bg-red-50/90' : ''}`}
                      >
                        <div className="grid gap-1">
                          <EditableNumberInput
                            aria-label={`${bank.name}当前持仓绝对金额，单位${amountUnit}`}
                            value={bank.currentExposure}
                            min={0}
                            step="0.01"
                            onValueChange={(value) =>
                              updateBank(bank.id, {
                                currentExposure: value ?? Number.NaN,
                              })
                            }
                            aria-invalid={exposureCellError || undefined}
                            className={`text-right ${
                              exposureHighlight
                                ? 'border-red-300 bg-red-50 text-red-950'
                                : ''
                            }`}
                          />
                          {exposureInvalid ? (
                            <span className="block max-w-44 whitespace-normal text-xs font-medium leading-4 text-red-700">
                              当前持仓必须是非负数字。
                            </span>
                          ) : postTradeExposureBreach ? (
                            <span className="block max-w-44 whitespace-normal text-xs font-medium leading-4 text-red-700">
                              {isRedemption ? (
                                <>同比例赎回后占比不变，仍超过适用上限。</>
                              ) : (
                                <>
                                  计入新增资金后仍超过适用上限{' '}
                                  {number(finalCap)} {amountUnit}。
                                </>
                              )}
                            </span>
                          ) : currentExposureBreach ? (
                            <span className="block max-w-44 whitespace-normal text-xs font-medium leading-4 text-red-700">
                              当前占比超限；计入新增资金后可稀释至上限内。
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-right text-slate-600 ${
                          exposureHighlight
                            ? 'bg-red-50/90 font-medium text-red-800'
                            : ''
                        }`}
                      >
                        {portfolio.aum > 0
                          ? percent(
                              (bank.currentExposure / portfolio.aum) * 100,
                            )
                          : '—'}
                      </TableCell>
                      <TableCell
                        className={`min-w-44 align-top ${
                          concentrationError
                            ? 'bg-red-50/90'
                            : concentrationNotice
                              ? 'bg-yellow-100/80'
                              : ''
                        }`}
                      >
                        <div className="grid gap-1">
                          <EditableNumberInput
                            aria-label={`${bank.name}经合规确认的适用集中度上限`}
                            min={0}
                            max={SFC_MAX_BANK_CONCENTRATION_PCT}
                            step="0.01"
                            value={bank.limitPct}
                            onValueChange={(value) =>
                              updateBank(bank.id, {
                                limitPct: value ?? Number.NaN,
                              })
                            }
                            aria-invalid={concentrationError ? true : undefined}
                            className={`text-right ${
                              concentrationError
                                ? 'border-red-300 bg-red-50 text-red-950'
                                : concentrationNotice
                                  ? 'border-yellow-300 bg-yellow-50 text-slate-950'
                                  : ''
                            }`}
                          />
                          {concentrationError ? (
                            <span
                              role="alert"
                              className="block max-w-52 whitespace-normal text-xs font-medium leading-4 text-red-600"
                            >
                              {concentrationError}
                            </span>
                          ) : concentrationNotice ? (
                            <span className="block max-w-52 whitespace-normal text-xs font-medium leading-4 text-yellow-800">
                              {concentrationNotice}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {number(isRedemption ? postTradeExposure : finalCap)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-teal-700">
                        {number(isRedemption ? redeemed : remaining)}
                      </TableCell>
                      <TableCell>
                        <Button
                          aria-label={`将${bank.name}移出${isRedemption ? '当前持仓名单' : '今日名单'}`}
                          title={
                            hasQuotes
                              ? isRedemption
                                ? '该机构仍有关联报价；请切换到净申购后先删除关联报价'
                                : '请先删除该机构的今日报价'
                              : `移出${isRedemption ? '当前持仓名单' : '今日名单'}，但保留在合作机构备选库`
                          }
                          variant="ghost"
                          size="icon-sm"
                          disabled={hasQuotes}
                          onClick={() => {
                            setBanks((old) =>
                              old.filter((item) => item.id !== bank.id),
                            );
                            setDirty(true);
                            clearTargetOutcome();
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!banks.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-20 text-center text-sm text-slate-500"
                    >
                      {isRedemption
                        ? '请先从合作机构备选库加入当前持仓机构。'
                        : '请先从合作机构备选库加入今天参与报价的机构。'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
              <p>
                {isRedemption ? (
                  <>
                    赎回后持仓 = 当前持仓 ×（交易后 AUM ÷ 当前
                    AUM）；同比例赎回金额 = 当前持仓 −
                    赎回后持仓。机构占比不会因同比例赎回改变。
                  </>
                ) : (
                  <>
                    当前占比 = 当前持仓 ÷ 当前 AUM；交易后额度上限 =（当前 AUM +
                    新增待配置资金）× 集中度上限；本次最多可新增 =
                    交易后额度上限 − 当前持仓。
                  </>
                )}
              </p>
              {isRedemption && quotes.length ? (
                <p className="mt-1">
                  净申购模式中的关联报价会保留；如需移除有关联报价的机构，请先切换到净申购并删除对应报价。
                </p>
              ) : null}
              <p className="mt-1">
                同一机构的全部产品合并占用额度。单一实体一般上限为
                10%；仅当该实体为符合条件的实质金融机构，并经合规确认满足
                8.2(g)(i) 条件时才可提高至 25%。本工具假设 AUM
                等于集中度计算使用的 NAV。
              </p>
            </div>
          </section>

          <section className={card}>
            <div className="section-head">
              <div>
                <p className="eyebrow">
                  03 · {isRedemption ? '赎回规则' : '市场报价'}
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {isRedemption ? '按现有组合同比例赎回' : '今日可投产品与报价'}
                </h2>
              </div>
              {isRedemption ? (
                <Badge className="bg-teal-50 text-teal-800">
                  不使用今日报价
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!banks.length}
                  onClick={() => {
                    setQuotes((old) => [
                      ...old,
                      {
                        id: id('quote'),
                        name: '新产品',
                        bankId: banks[0].id,
                        wamDays: null,
                        walDays: 30,
                        rate: 3,
                        cap: portfolio.transactionAmount,
                      },
                    ]);
                    setDirty(true);
                    clearTargetOutcome();
                  }}
                >
                  <Plus /> 添加报价
                </Button>
              )}
            </div>
            {isRedemption ? (
              <div className="p-5">
                <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    当前版本不选择具体赎回产品
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    系统按“净赎回金额 ÷ 当前
                    AUM”的比例，同步缩减现有组合中的所有资产和机构敞口。因此
                    YTM、WAM、WAL 与机构占比保持不变。
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    如果实际业务是优先使用现金、到期资产或指定产品，需在后续版本录入现有持仓明细后再优化赎回来源。
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="pl-5">产品</TableHead>
                      <TableHead>机构</TableHead>
                      <TableHead className="text-right">WAM/天</TableHead>
                      <TableHead className="text-right">WAL/天</TableHead>
                      <TableHead className="text-right">利率/%</TableHead>
                      <TableHead className="text-right">
                        本次可投上限
                        <span className="block text-[11px] font-normal text-slate-400">
                          绝对金额/{amountUnit}
                        </span>
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="min-w-48 pl-5">
                          <Input
                            aria-label="产品名称"
                            value={quote.name}
                            onChange={(event) =>
                              updateQuote(quote.id, {
                                name: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="min-w-32">
                          <NativeSelect
                            aria-label={`${quote.name}机构`}
                            value={quote.bankId}
                            onChange={(event) =>
                              updateQuote(quote.id, {
                                bankId: event.target.value,
                              })
                            }
                            className="w-full"
                          >
                            {banks.map((bank) => (
                              <NativeSelectOption value={bank.id} key={bank.id}>
                                {bank.name}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </TableCell>
                        <TableCell className="min-w-24">
                          <EditableNumberInput
                            aria-label={`${quote.name}计入WAM的天数`}
                            value={quote.wamDays}
                            placeholder="同 WAL"
                            min={0}
                            step={1}
                            onValueChange={(value) =>
                              updateQuote(quote.id, { wamDays: value })
                            }
                            aria-invalid={
                              (quote.wamDays !== null &&
                                (!Number.isFinite(quote.wamDays) ||
                                  quote.wamDays < 0 ||
                                  quote.wamDays > quote.walDays)) ||
                              undefined
                            }
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell className="min-w-24">
                          <EditableNumberInput
                            aria-label={`${quote.name}计入WAL的天数`}
                            value={quote.walDays}
                            min={0}
                            step={1}
                            onValueChange={(value) =>
                              updateQuote(quote.id, {
                                walDays: value ?? Number.NaN,
                              })
                            }
                            aria-invalid={
                              !Number.isFinite(quote.walDays) ||
                              quote.walDays < 0 ||
                              quoteWamDays(quote) > quote.walDays ||
                              undefined
                            }
                            className="text-right"
                          />
                        </TableCell>
                        {(
                          [
                            ['rate', quote.rate, '利率'],
                            ['cap', quote.cap, '报价额度'],
                          ] as const
                        ).map(([key, value, inputLabel]) => (
                          <TableCell className="min-w-24" key={key}>
                            <EditableNumberInput
                              aria-label={`${quote.name}${inputLabel}`}
                              value={value}
                              min={key === 'cap' ? 0 : undefined}
                              step="0.01"
                              onValueChange={(nextValue) =>
                                updateQuote(quote.id, {
                                  [key]: nextValue ?? Number.NaN,
                                })
                              }
                              aria-invalid={
                                !Number.isFinite(value) || undefined
                              }
                              className="text-right"
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            aria-label={`删除${quote.name}`}
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setQuotes((old) =>
                                old.filter((item) => item.id !== quote.id),
                              );
                              setDirty(true);
                              clearTargetOutcome();
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
                  WAL 填剩余最终到期天数。WAM 留空时自动按 WAL
                  处理；仅在已确认浮息工具可按下一次利率重定价计量时，填写更短的
                  WAM 天数。报价额度与 AUM 使用同一绝对金额单位。
                </p>
              </>
            )}
          </section>

          {hasRegulatoryLimitViolation ? (
            <Alert variant="destructive" aria-live="assertive">
              <AlertTriangle />
              <AlertTitle>
                存在超出监管硬上限、持仓合计异常或无效输入，请先修正上方提示。
              </AlertTitle>
            </Alert>
          ) : null}

          <div
            className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="size-4 text-teal-600" />
              {isRedemption
                ? '按现有组合同比例扣减；不使用市场报价'
                : '连续金额优化；未配置资金按零期限、零收益现金处理'}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                onClick={reset}
                className="w-full sm:w-auto"
              >
                <RefreshCcw /> 恢复示例
              </Button>
              <Button
                size="lg"
                onClick={calculate}
                disabled={hasRegulatoryLimitViolation}
                className="w-full bg-teal-600 px-5 text-white hover:bg-teal-700 sm:w-auto"
              >
                {isRedemption ? '测算赎回后组合' : '计算最优配置'}{' '}
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>

        <aside className="xl:self-start">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="eyebrow">决策面板</p>
                <h2 className="mt-1 text-lg font-semibold">
                  {isRedemption ? '赎回后组合快照' : '收益前沿与推荐配置'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {isRedemption
                    ? '按现有组合同比例缩减；结果以最近一次测算为准'
                    : '前沿随输入实时更新；配置结果以最近一次计算为准'}
                </p>
              </div>
              {hasRegulatoryLimitViolation ? (
                <Badge variant="destructive">监管/输入需修正</Badge>
              ) : dirty ? (
                <Badge className="bg-amber-100 text-amber-800">
                  待重新计算
                </Badge>
              ) : result.ok ? (
                <Badge className="bg-emerald-100 text-emerald-800">
                  <Check /> 约束通过
                </Badge>
              ) : (
                <Badge variant="destructive">输入需调整</Badge>
              )}
            </div>

            {isRedemption ? (
              <div className="border-b border-slate-100 p-5">
                <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                  <p className="eyebrow">赎回影响</p>
                  <h3 className="mt-1 text-base font-semibold">
                    同比例赎回不改变期限与收益指标
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    本模式没有新的买入配置，因此不展示收益前沿或目标 YTM
                    反推。交易后结果仅由赎回金额和当前组合快照决定。
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                  <div>
                    <p className="eyebrow">收益前沿</p>
                    <h3 className="mt-1 flex items-center gap-2 text-base font-semibold">
                      <TrendingUp className="size-4 text-teal-700" />
                      多一天期限，换来多少收益
                    </h3>
                  </div>
                  <div
                    className="inline-flex rounded-xl bg-slate-100 p-1"
                    role="tablist"
                    aria-label="选择期限指标"
                  >
                    {(['wam', 'wal'] as const).map((mode) => (
                      <button
                        key={mode}
                        id={`${mode}-frontier-tab`}
                        type="button"
                        role="tab"
                        aria-selected={frontierMode === mode}
                        aria-controls="frontier-panel"
                        onClick={() => {
                          setFrontierMode(mode);
                          clearTargetOutcome();
                        }}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          frontierMode === mode
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {mode.toUpperCase()} 曲线
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  id="frontier-panel"
                  role="tabpanel"
                  aria-labelledby={`${frontierMode}-frontier-tab`}
                >
                  <FrontierPanel
                    mode={frontierMode}
                    points={frontiers[frontierMode]}
                    currentLimit={
                      frontierMode === 'wam'
                        ? portfolio.maxWam
                        : portfolio.maxWal
                    }
                    otherLimit={
                      frontierMode === 'wam'
                        ? portfolio.maxWal
                        : portfolio.maxWam
                    }
                    onSelect={(day) => selectFrontierDay(frontierMode, day)}
                    targetYtm={targetYtm}
                    targetYtmError={targetYtmError}
                    targetYtmMessage={targetYtmMessage}
                    onTargetYtmChange={(value) => {
                      setTargetYtm(value);
                      clearTargetOutcome();
                    }}
                    onSolveTarget={reverseTargetYtm}
                    disabled={hasRegulatoryLimitViolation}
                  />
                </div>
              </div>
            )}

            <div className="border-b border-slate-100 px-5 py-4">
              <p className="eyebrow">{isRedemption ? '测算结果' : '最优解'}</p>
              <h3 className="mt-1 text-base font-semibold">
                {isRedemption ? '同比例赎回结果' : '推荐配置'}
              </h3>
            </div>

            {hasRegulatoryLimitViolation ? (
              <div className="p-5">
                <Alert variant="destructive" className="p-4">
                  <AlertTriangle />
                  <AlertTitle>
                    {isRedemption
                      ? '赎回测算已暂时隐藏。请先修正标红字段，再重新测算。'
                      : '推荐配置已暂时隐藏。请先修正标红字段，再重新计算。'}
                  </AlertTitle>
                </Alert>
              </div>
            ) : result.ok ? (
              <div
                aria-live="polite"
                className={dirty ? 'opacity-55 transition-opacity' : ''}
              >
                {result.tradeMode === 'redemption' ? (
                  <div className="px-5 pt-5">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          本次赎回比例
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          净赎回金额 ÷ 当前 AUM
                        </p>
                      </div>
                      <p className="text-xl font-semibold tabular-nums text-teal-800">
                        {percent(result.redemptionRatio * 100, 2)}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                  <Metric
                    label="交易后 AUM"
                    value={`${number(result.postAum)} ${amountUnit}`}
                    detail={`${result.tradeMode === 'redemption' ? '赎回' : '新增'} ${number(result.transactionAmount)} ${amountUnit}`}
                  />
                  <Metric
                    label="交易后 YTM"
                    value={percent(result.postYtm, 3)}
                    detail={
                      result.tradeMode === 'redemption'
                        ? '同比例赎回，与当前组合一致'
                        : `新增资金 ${percent(result.allocationYield, 3)}`
                    }
                    accent
                  />
                  <Metric
                    label="交易后 WAM"
                    value={`${number(result.postWam)} 天`}
                    detail={
                      result.tradeMode === 'redemption'
                        ? '同比例赎回，与当前组合一致'
                        : `计算所用上限 ${number(result.appliedMaxWam)} 天`
                    }
                  />
                  <Metric
                    label="交易后 WAL"
                    value={`${number(result.postWal)} 天`}
                    detail={
                      result.tradeMode === 'redemption'
                        ? '同比例赎回，与当前组合一致'
                        : `计算所用上限 ${number(result.appliedMaxWal)} 天`
                    }
                  />
                </div>

                {result.tradeMode === 'subscription' ? (
                  <>
                    {result.unallocated > EPSILON ? (
                      <div className="px-5 pb-4">
                        <Alert className="border-amber-200 bg-amber-50">
                          <AlertTriangle />
                          <AlertTitle>
                            仍有 {number(result.unallocated)} {amountUnit}{' '}
                            未配置，期限或额度约束已限制继续投资。
                          </AlertTitle>
                        </Alert>
                      </div>
                    ) : null}

                    <div className="border-t border-slate-100">
                      <h3 className="flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                        推荐金额与新增资金占比
                      </h3>
                      {result.allocations.length ||
                      result.unallocated > EPSILON ? (
                        <div className="divide-y divide-slate-100">
                          {[...result.allocations]
                            .sort(
                              (a, b) => b.amount * b.rate - a.amount * a.rate,
                            )
                            .map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 px-5 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {item.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {bankNames.get(item.bankId)} · WAM/WAL{' '}
                                    {number(quoteWamDays(item), 0)}/
                                    {number(item.walDays, 0)}天 ·{' '}
                                    {percent(item.rate)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold tabular-nums">
                                    {number(item.amount)}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {amountUnit} · 占新增资金{' '}
                                    {result.transactionAmount > EPSILON
                                      ? percent(
                                          (item.amount /
                                            result.transactionAmount) *
                                            100,
                                          1,
                                        )
                                      : '—'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          {result.unallocated > EPSILON ? (
                            <div className="flex items-center justify-between gap-3 px-5 py-3">
                              <div>
                                <p className="text-sm font-medium">保留现金</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  零期限 · 零收益
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold tabular-nums">
                                  {number(result.unallocated)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {amountUnit} · 占新增资金{' '}
                                  {result.transactionAmount > EPSILON
                                    ? percent(
                                        (result.unallocated /
                                          result.transactionAmount) *
                                          100,
                                        1,
                                      )
                                    : '—'}
                                </p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="px-5 pb-4 text-sm text-slate-500">
                          当前约束下没有正收益配置。
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      按比例缩减现有持仓
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      当前只有组合与机构级汇总数据，因此不生成产品级赎回顺序。下列为已录入机构敞口随组合缩减的影响；其余赎回来自未逐项录入的资产。
                    </p>
                  </div>
                )}

                <div className="border-t border-slate-100">
                  <h3 className="flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                    <Landmark className="size-4 text-teal-700" />{' '}
                    {result.tradeMode === 'redemption'
                      ? '机构同比例赎回明细'
                      : '交易后机构占比'}
                  </h3>
                  <div className="space-y-4 px-5 pb-5">
                    {result.banks.map((bank) => {
                      const used =
                        bank.limitPct > 0
                          ? Math.min(100, (bank.finalPct / bank.limitPct) * 100)
                          : 0;
                      const atLimit = bank.finalPct >= bank.limitPct - 1e-7;
                      return (
                        <div key={bank.id}>
                          <div className="mb-1.5 flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
                            <span className="font-medium text-slate-700">
                              {bank.name}
                            </span>
                            <span>
                              {percent(bank.finalPct)} /{' '}
                              {percent(bank.limitPct)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                atLimit ? 'bg-amber-500' : 'bg-teal-500'
                              }`}
                              style={{ width: `${used}%` }}
                            />
                          </div>
                          <div className="mt-1 flex flex-col gap-1 text-xs text-slate-400 sm:flex-row sm:justify-between">
                            <span>
                              {result.tradeMode === 'redemption' ? (
                                <>
                                  赎回{' '}
                                  {number(Math.abs(bank.transactionChange))}{' '}
                                  {amountUnit} · 剩余{' '}
                                  {number(bank.finalExposure)} {amountUnit}
                                </>
                              ) : (
                                <>
                                  新增 {number(bank.transactionChange)}{' '}
                                  {amountUnit}
                                </>
                              )}
                            </span>
                            <span>
                              {atLimit
                                ? '已触及上限'
                                : `余量 ${number(bank.remaining)} ${amountUnit}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div aria-live="polite" className="p-5">
                <Alert variant="destructive" className="p-4">
                  <AlertTriangle />
                  <div>
                    <AlertTitle>当前输入没有可行解</AlertTitle>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                      {result.messages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
