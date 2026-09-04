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

type Portfolio = {
  aum: number;
  ytm: number;
  wam: number;
  wal: number;
  cash: number;
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

type SuccessResult = {
  ok: true;
  postAum: number;
  postYtm: number;
  postWam: number;
  postWal: number;
  newMoneyYield: number;
  unallocated: number;
  allocations: Array<Quote & { amount: number }>;
  banks: Array<
    Bank & {
      added: number;
      finalExposure: number;
      finalPct: number;
      remaining: number;
    }
  >;
};

type ModelResult =
  | SuccessResult
  | { ok: false; messages: string[]; postAum: number };

type FrontierMode = 'wam' | 'wal';

type FrontierPoint = {
  day: number;
  ytm: number;
  wam: number;
  wal: number;
  unallocated: number;
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
  aum: 100,
  ytm: 2.5,
  wam: 30,
  wal: 50,
  cash: 20,
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
    name: '银行 C',
    currentExposure: 5,
    limitPct: 10,
  },
];

const initialBankLibrary: BankTemplate[] = [
  { id: 'bank-a', name: '银行 A', defaultLimitPct: 25 },
  { id: 'bank-b', name: '银行 B', defaultLimitPct: 25 },
  { id: 'bank-c', name: '银行 C', defaultLimitPct: 10 },
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
    name: 'C行 7天定存',
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
) {
  if (!Number.isFinite(value) || value <= maximum) return null;
  return `当前组合 ${metric} 已超过 SFC ${maximum} 天上限；该事实仍可录入，以测算回到合规区间的方案。`;
}

function bankConcentrationError(value: number) {
  if (!Number.isFinite(value)) return '集中度上限必须是有效数字。';
  if (value < 0) return '集中度上限不得低于 0%。';
  if (value > SFC_MAX_BANK_CONCENTRATION_PCT) {
    return 'SFC 对银行类单一实体的最高例外上限为 25%；一般上限仍为 10%。';
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
  return '超过一般 10% 上限：请确认该银行满足 SFC 8.2(g)(i) 例外条件。';
}

function quoteWamDays(quote: Quote) {
  return quote.wamDays ?? quote.walDays;
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

function optimise(
  portfolio: Portfolio,
  banks: Bank[],
  quotes: Quote[],
): ModelResult {
  const errors: string[] = [];
  const postAum = portfolio.aum + portfolio.cash;

  if (!Number.isFinite(portfolio.aum) || portfolio.aum < 0) {
    errors.push('当前 AUM 必须为非负数字。');
  }
  if (!Number.isFinite(portfolio.cash) || portfolio.cash < 0) {
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
    if (!bank.name.trim()) errors.push('银行名称不能为空。');
    if (!Number.isFinite(bank.currentExposure) || bank.currentExposure < 0) {
      errors.push(`${bank.name || '某银行'}的当前持有金额无效。`);
    }
    const concentrationError = bankConcentrationError(bank.limitPct);
    if (concentrationError) {
      errors.push(`${bank.name || '某银行'}：${concentrationError}`);
    }
    if (bank.currentExposure > (postAum * bank.limitPct) / 100 + EPSILON) {
      errors.push(
        `${bank.name || '某银行'}现有敞口已超过交易后上限，新增配置无法修复。`,
      );
    }
  });

  quotes.forEach((quote) => {
    if (!quote.name.trim()) errors.push('产品名称不能为空。');
    if (!bankIds.has(quote.bankId)) {
      errors.push(`${quote.name || '某产品'}没有对应的银行。`);
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
  if (errors.length) return { ok: false, messages: errors, postAum };

  const matrix: number[][] = [];
  const limits: number[] = [];
  matrix.push(quotes.map(() => 1));
  limits.push(portfolio.cash);

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
    limits.push(Math.min(portfolio.cash, quote.cap));
  });

  const raw = simplex(
    quotes.map((quote) => quote.rate),
    matrix,
    limits,
  );
  if (!raw) {
    return {
      ok: false,
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
    postAum,
    postYtm: (portfolio.aum * portfolio.ytm + interest) / postAum,
    postWam: (portfolio.aum * portfolio.wam + wamDuration) / postAum,
    postWal: (portfolio.aum * portfolio.wal + walDuration) / postAum,
    newMoneyYield: portfolio.cash > 0 ? interest / portfolio.cash : 0,
    unallocated: Math.max(0, portfolio.cash - invested),
    allocations: quotes
      .map((quote, index) => ({ ...quote, amount: allocation[index] }))
      .filter((quote) => quote.amount > EPSILON),
    banks: banks.map((bank) => {
      const added = allocation.reduce(
        (sum, value, index) =>
          sum + (quotes[index].bankId === bank.id ? value : 0),
        0,
      );
      const finalExposure = bank.currentExposure + added;
      const finalCap = (postAum * bank.limitPct) / 100;
      return {
        ...bank,
        added,
        finalExposure,
        finalPct: (finalExposure / postAum) * 100,
        remaining: Math.max(0, finalCap - finalExposure),
      };
    }),
  };
}

function buildFrontier(
  mode: FrontierMode,
  portfolio: Portfolio,
  banks: Bank[],
  quotes: Quote[],
): FrontierPoint[] {
  const postAum = portfolio.aum + portfolio.cash;
  if (postAum <= 0) return [];

  const minimum =
    mode === 'wam'
      ? (portfolio.aum * portfolio.wam) / postAum
      : (portfolio.aum * portfolio.wal) / postAum;
  const regulatoryCeiling =
    mode === 'wam' ? SFC_MAX_WAM_DAYS : SFC_MAX_WAL_DAYS;
  const firstDay = Math.max(0, Math.ceil(minimum - EPSILON));
  if (firstDay > regulatoryCeiling) return [];

  const points: FrontierPoint[] = [];
  for (let day = firstDay; day <= regulatoryCeiling; day += 1) {
    const candidate: Portfolio = {
      ...portfolio,
      ...(mode === 'wam' ? { maxWam: day } : { maxWal: day }),
    };
    const outcome = optimise(candidate, banks, quotes);
    if (outcome.ok) {
      points.push({
        day,
        ytm: outcome.postYtm,
        wam: outcome.postWam,
        wal: outcome.postWal,
        unallocated: outcome.unallocated,
      });
    }
  }
  return points;
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

  return (
    <label className="grid gap-1.5">
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
          className={`h-10 rounded-xl bg-white pr-12 text-base ${
            warning && !validationError
              ? 'border-amber-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/15'
              : 'border-slate-200 focus-visible:border-teal-600 focus-visible:ring-teal-600/15'
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
        <span aria-live="polite" className="text-xs font-medium text-amber-700">
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
}: {
  mode: FrontierMode;
  points: FrontierPoint[];
  currentLimit: number | null;
  otherLimit: number | null;
  onSelect: (day: number) => void;
}) {
  const label = mode.toUpperCase();

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
      </div>
    );
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const gainBps = Math.max(0, (last.ytm - first.ytm) * 100);
  const plateau =
    points.find((point) => Math.abs(last.ytm - point.ytm) <= 0.00001) ?? last;

  return (
    <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_220px]">
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
                        {label} 上限 {item.payload.day} 天
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
                    </div>
                  )}
                />
              }
            />
            {currentLimit !== null ? (
              <ReferenceLine
                x={currentLimit}
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
          </LineChart>
        </ChartContainer>
        <p className="mt-1 text-center text-xs text-slate-400">
          点击曲线上的位置，即可采用对应的 {label} 上限并重新计算
        </p>
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
        <dl className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm">
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
            <dt className="text-slate-500">收益平台</dt>
            <dd className="font-medium">{plateau.day} 天起</dd>
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
    optimise(initialPortfolio, initialBanks, initialQuotes),
  );
  const [dirty, setDirty] = useState(false);
  const [frontierMode, setFrontierMode] = useState<FrontierMode>('wam');
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
          '使用页面当前填写的组合、银行敞口和报价，计算并显示最高收益配置。',
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
          const nextResult = optimise(
            current.portfolio,
            current.banks,
            current.quotes,
          );
          setResult(nextResult);
          setDirty(false);
          if (!nextResult.ok) {
            return { ok: false, messages: nextResult.messages };
          }
          return {
            ok: true,
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

  const postAum = portfolio.aum + portfolio.cash;
  const currentWamInputError = termValueError(portfolio.wam, 'WAM');
  const currentWalInputError = termValueError(portfolio.wal, 'WAL');
  const currentWamWarning = currentTermComplianceWarning(
    portfolio.wam,
    'WAM',
    SFC_MAX_WAM_DAYS,
  );
  const currentWalWarning = currentTermComplianceWarning(
    portfolio.wal,
    'WAL',
    SFC_MAX_WAL_DAYS,
  );
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
  const newBankLimitError = bankConcentrationError(newBankLimitPct);
  const newBankLimitNotice = bankConcentrationNotice(newBankLimitPct);
  const hasRegulatoryLimitViolation = Boolean(
    currentWamInputError ||
    currentWalInputError ||
    maxWamError ||
    maxWalError ||
    banks.some((bank) => bankConcentrationError(bank.limitPct)),
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
    () => ({
      wam: buildFrontier('wam', portfolio, banks, quotes),
      wal: buildFrontier('wal', portfolio, banks, quotes),
    }),
    [portfolio, banks, quotes],
  );
  const updatePortfolio = <K extends keyof Portfolio>(
    key: K,
    value: Portfolio[K],
  ) => {
    setPortfolio((old) => ({ ...old, [key]: value }));
    setDirty(true);
  };
  const updateBank = (bankId: string, patch: Partial<Bank>) => {
    setBanks((old) =>
      old.map((bank) => (bank.id === bankId ? { ...bank, ...patch } : bank)),
    );
    setDirty(true);
  };
  const updateQuote = (quoteId: string, patch: Partial<Quote>) => {
    setQuotes((old) =>
      old.map((quote) =>
        quote.id === quoteId ? { ...quote, ...patch } : quote,
      ),
    );
    setDirty(true);
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
    setResult(optimise(portfolio, banks, quotes));
    setDirty(false);
  };
  const reset = () => {
    setPortfolio(initialPortfolio);
    setBanks(initialBanks);
    setQuotes(initialQuotes);
    setResult(optimise(initialPortfolio, initialBanks, initialQuotes));
    setDirty(false);
  };
  const selectFrontierDay = (mode: FrontierMode, day: number) => {
    const nextPortfolio = {
      ...portfolio,
      ...(mode === 'wam' ? { maxWam: day } : { maxWal: day }),
    };
    setPortfolio(nextPortfolio);
    setResult(optimise(nextPortfolio, banks, quotes));
    setDirty(false);
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
                在期限与银行敞口内，寻找最高收益配置
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

      <div className="mx-auto grid max-w-[1540px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.75fr)] lg:px-8">
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
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                label="当前 AUM（绝对金额）"
                value={portfolio.aum}
                suffix={amountUnit}
                min={0}
                error={
                  Number.isFinite(portfolio.aum) && portfolio.aum < 0
                    ? '当前 AUM 不得小于 0。'
                    : null
                }
                onChange={(value) =>
                  updatePortfolio('aum', value ?? Number.NaN)
                }
              />
              <NumberField
                label="新增待配置资金（绝对金额）"
                value={portfolio.cash}
                suffix={amountUnit}
                min={0}
                error={
                  Number.isFinite(portfolio.cash) && portfolio.cash < 0
                    ? '新增待配置资金不得小于 0。'
                    : null
                }
                onChange={(value) =>
                  updatePortfolio('cash', value ?? Number.NaN)
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
                onChange={(value) =>
                  updatePortfolio('wal', value ?? Number.NaN)
                }
              />
              <NumberField
                label="WAM 上限"
                value={portfolio.maxWam}
                suffix="天"
                optional
                min={0}
                max={SFC_MAX_WAM_DAYS}
                error={maxWamError}
                onChange={(value) => updatePortfolio('maxWam', value)}
              />
              <NumberField
                label="WAL 上限"
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
              所有金额都填写绝对金额并使用同一单位。交易后 AUM = 当前 AUM +
              新增待配置资金；新增资金尚未包含在当前 AUM 中。当前 WAM/WAL
              是事实快照，超标时仍可录入以测算修复方案；目标留空时仍自动执行 SFC
              监管上限 WAM 60 天、WAL 120 天。
            </p>
          </section>

          <section className={card}>
            <div className="section-head">
              <div>
                <p className="eyebrow">02 · 收益—期限前沿</p>
                <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold">
                  <TrendingUp className="size-5 text-teal-700" />
                  多一天期限，换来多少收益
                </h2>
              </div>
              <div
                className="inline-flex rounded-xl bg-slate-100 p-1"
                role="tablist"
                aria-label="选择期限指标"
              >
                {(['wam', 'wal'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={frontierMode === mode}
                    onClick={() => setFrontierMode(mode)}
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
            <div role="tabpanel">
              {frontierMode === 'wam' ? (
                <FrontierPanel
                  mode="wam"
                  points={frontiers.wam}
                  currentLimit={portfolio.maxWam}
                  otherLimit={portfolio.maxWal}
                  onSelect={(day) => selectFrontierDay('wam', day)}
                />
              ) : (
                <FrontierPanel
                  mode="wal"
                  points={frontiers.wal}
                  currentLimit={portfolio.maxWal}
                  otherLimit={portfolio.maxWam}
                  onSelect={(day) => selectFrontierDay('wal', day)}
                />
              )}
            </div>
          </section>

          <section className={card}>
            <div className="section-head">
              <div>
                <p className="eyebrow">03 · 银行敞口</p>
                <h2 className="mt-1 text-lg font-semibold">
                  今日参与银行与集中度额度
                </h2>
              </div>
              <Badge variant="outline">
                今日 {banks.length} 家 · 备选库 {bankLibrary.length} 家
              </Badge>
            </div>

            <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 p-5 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      合作银行备选库
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      选择后加入今天的敞口与报价名单
                    </p>
                  </div>
                  <Badge variant="secondary">仅保存在本机</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <NativeSelect
                    aria-label="从合作银行备选库选择"
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
                        ? '选择备选银行'
                        : '备选银行已全部加入'}
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
                    <Plus /> 加入今日
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">
                  新增合作银行
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                  <label htmlFor="new-bank-name" className="grid gap-1">
                    <span className="text-xs text-slate-500">银行名称</span>
                    <Input
                      id="new-bank-name"
                      aria-label="新增合作银行名称"
                      value={newBankName}
                      placeholder="例如：银行 F"
                      onChange={(event) => setNewBankName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveBankToLibrary();
                      }}
                    />
                  </label>
                  <label htmlFor="new-bank-limit" className="grid gap-1">
                    <span className="text-xs text-slate-500">
                      默认上限（%）
                    </span>
                    <EditableNumberInput
                      id="new-bank-limit"
                      aria-label="新增合作银行默认集中度上限百分比"
                      value={newBankLimitPct}
                      min={0}
                      max={SFC_MAX_BANK_CONCENTRATION_PCT}
                      step="0.01"
                      onValueChange={(value) =>
                        setNewBankLimitPct(value ?? Number.NaN)
                      }
                      aria-invalid={newBankLimitError ? true : undefined}
                      className="text-right"
                    />
                    {newBankLimitError ? (
                      <span
                        role="alert"
                        className="text-xs font-medium leading-4 text-red-600"
                      >
                        {newBankLimitError}
                      </span>
                    ) : newBankLimitNotice ? (
                      <span className="text-xs font-medium leading-4 text-amber-700">
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

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="pl-5">银行</TableHead>
                  <TableHead className="text-right">
                    当前持仓
                    <span className="block text-[11px] font-normal text-slate-400">
                      绝对金额/{amountUnit}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    当前占比
                    <span className="block text-[11px] font-normal text-slate-400">
                      占当前 AUM
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    适用集中度上限
                    <span className="block text-[11px] font-normal text-slate-400">
                      合规确认 · 占交易后 NAV/%
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    交易后额度上限
                    <span className="block text-[11px] font-normal text-slate-400">
                      绝对金额/{amountUnit}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    本次最多可新增
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
                  const remaining = Math.max(
                    0,
                    finalCap - bank.currentExposure,
                  );
                  const hasQuotes = quotes.some(
                    (quote) => quote.bankId === bank.id,
                  );
                  return (
                    <TableRow key={bank.id}>
                      <TableCell className="min-w-32 pl-5">
                        <p className="font-medium text-slate-800">
                          {bank.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          今日名单
                        </p>
                      </TableCell>
                      <TableCell className="min-w-28">
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
                          aria-invalid={
                            !Number.isFinite(bank.currentExposure) ||
                            bank.currentExposure < 0 ||
                            undefined
                          }
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {portfolio.aum > 0
                          ? percent(
                              (bank.currentExposure / portfolio.aum) * 100,
                            )
                          : '—'}
                      </TableCell>
                      <TableCell className="min-w-44">
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
                            className="text-right"
                          />
                          {concentrationError ? (
                            <span
                              role="alert"
                              className="max-w-52 text-xs font-medium leading-4 text-red-600"
                            >
                              {concentrationError}
                            </span>
                          ) : concentrationNotice ? (
                            <span className="max-w-52 text-xs font-medium leading-4 text-amber-700">
                              {concentrationNotice}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {number(finalCap)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-teal-700">
                        {number(remaining)}
                      </TableCell>
                      <TableCell>
                        <Button
                          aria-label={`将${bank.name}移出今日名单`}
                          title={
                            hasQuotes
                              ? '请先删除该银行的今日报价'
                              : '移出今日名单，但保留在合作银行备选库'
                          }
                          variant="ghost"
                          size="icon-sm"
                          disabled={hasQuotes}
                          onClick={() => {
                            setBanks((old) =>
                              old.filter((item) => item.id !== bank.id),
                            );
                            setDirty(true);
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
                      请先从合作银行备选库加入今天参与报价的银行。
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
              <p>
                当前占比 = 当前持仓 ÷ 当前 AUM；交易后额度上限 =（当前 AUM +
                新增待配置资金）× 集中度上限；本次最多可新增 = 交易后额度上限 −
                当前持仓。
              </p>
              <p className="mt-1">
                同一家银行的全部产品合并占用额度。SFC 一般上限为
                10%；只有在已由合规确认满足 8.2(g)(i) 条件时才可提高，且最高为
                25%。本工具在此假设输入的 AUM 等于用于集中度计算的 NAV。
              </p>
            </div>
          </section>

          <section className={card}>
            <div className="section-head">
              <div>
                <p className="eyebrow">04 · 市场报价</p>
                <h2 className="mt-1 text-lg font-semibold">
                  今日可投产品与报价
                </h2>
              </div>
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
                      cap: portfolio.cash,
                    },
                  ]);
                  setDirty(true);
                }}
              >
                <Plus /> 添加报价
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="pl-5">产品</TableHead>
                  <TableHead>银行</TableHead>
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
                          updateQuote(quote.id, { name: event.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell className="min-w-32">
                      <NativeSelect
                        aria-label={`${quote.name}银行`}
                        value={quote.bankId}
                        onChange={(event) =>
                          updateQuote(quote.id, { bankId: event.target.value })
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
                          aria-invalid={!Number.isFinite(value) || undefined}
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
              处理；仅在已确认浮息工具可按下一次利率重定价计量时，填写更短的 WAM
              天数。报价额度与 AUM 使用同一绝对金额单位。
            </p>
          </section>

          {hasRegulatoryLimitViolation ? (
            <Alert variant="destructive" aria-live="assertive">
              <AlertTriangle />
              <AlertTitle>
                存在超出监管硬上限或无效的输入，请先修正标红字段。
              </AlertTitle>
            </Alert>
          ) : null}

          <div
            className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="size-4 text-teal-600" />
              连续金额优化；未配置资金按零期限、零收益现金处理
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={reset}>
                <RefreshCcw /> 恢复示例
              </Button>
              <Button
                size="lg"
                onClick={calculate}
                disabled={hasRegulatoryLimitViolation}
                className="bg-teal-600 px-5 text-white hover:bg-teal-700"
              >
                计算最优配置 <ArrowRight />
              </Button>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section
            aria-live="polite"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="eyebrow">最优解</p>
                <h2 className="mt-1 text-lg font-semibold">推荐配置</h2>
              </div>
              {hasRegulatoryLimitViolation ? (
                <Badge variant="destructive">监管上限超出</Badge>
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

            {hasRegulatoryLimitViolation ? (
              <div className="p-5">
                <Alert variant="destructive" className="p-4">
                  <AlertTriangle />
                  <AlertTitle>
                    推荐配置已暂时隐藏。请先修正标红字段，再重新计算。
                  </AlertTitle>
                </Alert>
              </div>
            ) : result.ok ? (
              <div className={dirty ? 'opacity-55 transition-opacity' : ''}>
                <div className="grid grid-cols-2 gap-3 p-5">
                  <Metric
                    label="交易后 AUM"
                    value={`${number(result.postAum)} ${amountUnit}`}
                    detail={`新增 ${number(portfolio.cash)} ${amountUnit}`}
                  />
                  <Metric
                    label="交易后 YTM"
                    value={percent(result.postYtm, 3)}
                    detail={`新增资金 ${percent(result.newMoneyYield, 3)}`}
                    accent
                  />
                  <Metric
                    label="交易后 WAM"
                    value={`${number(result.postWam)} 天`}
                    detail={
                      portfolio.maxWam === null
                        ? `SFC 上限 ${SFC_MAX_WAM_DAYS} 天`
                        : `上限 ${number(portfolio.maxWam)} 天`
                    }
                  />
                  <Metric
                    label="交易后 WAL"
                    value={`${number(result.postWal)} 天`}
                    detail={
                      portfolio.maxWal === null
                        ? `SFC 上限 ${SFC_MAX_WAL_DAYS} 天`
                        : `上限 ${number(portfolio.maxWal)} 天`
                    }
                  />
                </div>

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
                    推荐金额
                  </h3>
                  {result.allocations.length ? (
                    <div className="divide-y divide-slate-100">
                      {[...result.allocations]
                        .sort((a, b) => b.amount * b.rate - a.amount * a.rate)
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
                                {amountUnit} ·{' '}
                                {portfolio.cash
                                  ? percent(
                                      (item.amount / portfolio.cash) * 100,
                                      1,
                                    )
                                  : '0%'}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="px-5 pb-4 text-sm text-slate-500">
                      当前约束下没有正收益配置。
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100">
                  <h3 className="flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                    <Landmark className="size-4 text-teal-700" /> 交易后银行占比
                  </h3>
                  <div className="space-y-4 px-5 pb-5">
                    {result.banks.map((bank) => {
                      const used =
                        bank.limitPct > 0
                          ? Math.min(100, (bank.finalPct / bank.limitPct) * 100)
                          : 0;
                      const atLimit = bank.remaining <= 0.001;
                      return (
                        <div key={bank.id}>
                          <div className="mb-1.5 flex justify-between text-sm">
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
                          <div className="mt-1 flex justify-between text-xs text-slate-400">
                            <span>
                              新增 {number(bank.added)} {amountUnit}
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
              <div className="p-5">
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
