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
  Moon,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sun,
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

import { I18nProvider, useI18n } from '@/components/i18n-provider';
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

import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  htmlLang,
  localeOptions,
  parseLocale,
  parseTheme,
  readStoredPreference,
  translateText,
  type Locale,
  type Theme,
  writeStoredPreference,
} from '@/lib/i18n';
import {
  type TradeMode,
  type WorkspaceView,
  type Portfolio,
  type Bank,
  type BankTemplate,
  type AmountUnit,
  type Quote,
  type Holding,
  type ModelResult,
  type FrontierMode,
  type FrontierPoint,
  type WebModelContext,
  initialPortfolio,
  initialBanks,
  initialHoldings,
  initialBankLibrary,
  BANK_LIBRARY_STORAGE_KEY,
  initialQuotes,
  EPSILON,
  SFC_MAX_WAM_DAYS,
  SFC_MAX_WAL_DAYS,
  SFC_MAX_BANK_CONCENTRATION_PCT,
  UNASSIGNED_BANK_ID,
  EXCLUDED_BANK_SELECT_VALUE,
  amountTolerance,
  termValueError,
  regulatoryTermError,
  currentTermComplianceWarning,
  bankConcentrationError,
  bankConcentrationNotice,
  quoteWamDays,
  postAumOf,
  redemptionStress,
  postTradeExistingExposure,
  aggregateInstitutionExposures,
  holdingValidationErrors,
  institutionExposureTotalError,
  buildProRataHoldingOutcomes,
  optimiseSubscription,
  calculatePlan,
  buildFrontier,
  solveTargetYtm,
  number,
  percent,
  id,
  parseBankLibrary,
} from '@/lib/planner';

const decimalDraftPattern = /^-?(?:\d+\.?\d*|\.\d*)?$/;

function numericDraft(value: number | null) {
  return value === null || !Number.isFinite(value) ? '' : String(value);
}

function parseNumericDraft(value: string) {
  if (value === '' || value === '-' || value === '.' || value === '-.') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? (parsed === 0 ? 0 : parsed) : null;
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
  const { t } = useI18n();
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
      <span className="flex justify-between text-sm font-medium text-foreground/85">
        {t(label)}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground/75">
            {t('可留空')}
          </span>
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
                ? 'border-yellow-300 bg-yellow-50 text-foreground focus-visible:border-yellow-500 focus-visible:ring-yellow-500/15'
                : 'border-border bg-card focus-visible:border-primary focus-visible:ring-primary/20'
          }`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground/75">
          {t(suffix)}
        </span>
      </span>
      {validationError ? (
        <span role="alert" className="text-xs font-medium text-red-600">
          {t(validationError)}
        </span>
      ) : warning ? (
        <span
          aria-live="polite"
          className={`text-xs font-medium ${
            warningTone === 'red' ? 'text-red-700' : 'text-yellow-800'
          }`}
        >
          {t(warning)}
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
  const { t } = useI18n();
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? 'border-primary/35 bg-accent/70' : 'border-border bg-muted/40'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t(label)}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{t(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t(detail)}</p>
    </div>
  );
}

const frontierChartConfig = {
  ytm: {
    label: 'YTM',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

function FrontierPanel({
  mode,
  points,
  currentLimit,
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
  onSelect: (day: number) => void;
  targetYtm: number | null;
  targetYtmError: string | null;
  targetYtmMessage: string | null;
  onTargetYtmChange: (value: number | null) => void;
  onSolveTarget: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const label = mode.toUpperCase();
  const targetControl = (
    <form
      className="mt-4 rounded-2xl border border-primary/25 bg-accent/50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSolveTarget();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor="target-ytm" className="min-w-44 flex-1">
          <span className="mb-1.5 block text-sm font-semibold text-foreground">
            {t('目标交易后 YTM')}
          </span>
          <span className="relative block">
            <EditableNumberInput
              id="target-ytm"
              aria-label={t('目标交易后YTM百分比')}
              aria-invalid={targetYtmError ? true : undefined}
              value={targetYtm}
              step="0.001"
              disabled={disabled}
              placeholder={t('例如 3.000')}
              onValueChange={onTargetYtmChange}
              className={`h-10 rounded-xl pr-9 text-base ${
                targetYtmError
                  ? 'border-red-300 bg-red-50 text-red-950'
                  : 'border-primary/35 bg-card focus-visible:border-primary focus-visible:ring-primary/20'
              }`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground/75">
              %
            </span>
          </span>
        </label>
        <Button
          type="submit"
          disabled={disabled || targetYtm === null}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {t('反推期限与配置比例')}
          <ArrowRight />
        </Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {t('目标按“至少达到”处理；系统反推所选')}
        {label}{' '}
        {t('的最短上限和产品比例，另一项当前上限及 SFC 硬上限继续生效。')}
      </p>
      {targetYtmError ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {t(targetYtmError)}
        </p>
      ) : targetYtmMessage ? (
        <p aria-live="polite" className="mt-2 text-xs font-medium text-primary">
          {t(targetYtmMessage)}
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
            {t('当前组合在 SFC 的')}
            {label} {t('区间内没有可行点，请先放宽另一项期限约束或检查输入。')}
          </AlertTitle>
        </Alert>
        {targetControl}
      </div>
    );
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const plateau = points.find((point) => point.isPlateauStart) ?? last;
  const hasPlateau = plateau.day < last.day - 0.001;

  return (
    <div className="p-5">
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
              unit={t('天')}
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
              cursor={{
                stroke: 'var(--muted-foreground)',
                strokeDasharray: '4 4',
              }}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => (
                    <div className="grid min-w-36 gap-1">
                      <span className="text-muted-foreground">
                        {label}
                        {t('上限')}
                        {number(item.payload.day)}
                        {t('天')}
                      </span>
                      <span className="font-semibold text-foreground">
                        {t('最高 YTM')}
                        {percent(Number(value), 3)}
                      </span>
                      <span className="text-muted-foreground">
                        {t('实际 WAM')}
                        {number(item.payload.wam)}
                        {t('天 · WAL')} {number(item.payload.wal)}
                        {t('天')}
                      </span>
                      <span className="text-primary">
                        {t('较最紧点 +')}
                        {number((item.payload.ytm - first.ytm) * 100, 1)} bp
                      </span>
                      {item.payload.bindingConstraints?.length ? (
                        <span className="max-w-56 text-muted-foreground">
                          {t('约束：')}
                          {item.payload.bindingConstraints.map(t).join(t('、'))}
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
                stroke="var(--chart-2)"
                strokeDasharray="5 4"
                label={{
                  value: t('当前选择'),
                  position: 'insideTopRight',
                  fill: 'var(--chart-2)',
                  fontSize: 12,
                }}
              />
            ) : null}
            {hasPlateau ? (
              <ReferenceLine
                x={plateau.day}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 4"
              />
            ) : null}
            {targetYtm !== null &&
            Number.isFinite(targetYtm) &&
            targetYtm >= first.ytm - 0.0001 &&
            targetYtm <= last.ytm + 0.0001 ? (
              <ReferenceLine
                y={targetYtm}
                stroke="var(--primary)"
                strokeDasharray="3 4"
                label={{
                  value: t('目标 YTM'),
                  position: 'insideBottomLeft',
                  fill: 'var(--primary)',
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
                fill: 'var(--chart-1)',
                stroke: 'var(--card)',
                strokeWidth: 3,
              }}
            />
            {hasPlateau ? (
              <ReferenceDot
                x={plateau.day}
                y={plateau.ytm}
                r={5}
                fill="var(--card)"
                stroke="var(--chart-1)"
                strokeWidth={3}
              />
            ) : null}
          </LineChart>
        </ChartContainer>
        {hasPlateau ? (
          <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-primary">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-primary"
            />
            <span>
              {t('坐标（')}
              {number(plateau.day)}
              {t('天，')}
              {percent(plateau.ytm, 3)}
              {t('）· 最大 YTM')}
            </span>
          </p>
        ) : null}
        <p className="mt-1 text-center text-xs text-muted-foreground/75">
          {t('点击曲线上的位置，即可采用对应的')}
          {label}
          {t('上限并重新计算')}
        </p>
        {targetControl}
      </div>
    </div>
  );
}

const card =
  'rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:shadow-black/20';

function PlannerWorkspace({
  locale,
  theme,
  onLocaleChange,
  onThemeToggle,
}: {
  locale: Locale;
  theme: Theme;
  onLocaleChange: (locale: Locale) => void;
  onThemeToggle: () => void;
}) {
  const { t } = useI18n();
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('planner');
  const [portfolioInput, setPortfolio] = useState<Portfolio>({
    ...initialPortfolio,
    redemptionStressPct: 2,
  });
  const [banks, setBanks] = useState(initialBanks);
  const [holdings, setHoldings] = useState(initialHoldings);
  const portfolio = useMemo(
    () => ({
      ...portfolioInput,
      cashBufferAmount: holdings
        .filter((h) => h.isCash)
        .reduce((sum, h) => sum + h.amount, 0),
    }),
    [portfolioInput, holdings],
  );
  const stress = redemptionStress(portfolio);
  const modelBanks = useMemo(
    () => aggregateInstitutionExposures(banks, holdings),
    [banks, holdings],
  );
  const [quotes, setQuotes] = useState(initialQuotes);
  const [bankLibrary, setBankLibrary] = useState(initialBankLibrary);
  const [bankLibraryLoaded, setBankLibraryLoaded] = useState(false);
  const [selectedBankTemplateId, setSelectedBankTemplateId] =
    useState('bank-d');
  const [newBankName, setNewBankName] = useState('');
  const [newBankLimitPct, setNewBankLimitPct] = useState(10);
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('百万元');
  const [storedResult, setResult] = useState<ModelResult>(() =>
    calculatePlan(
      { ...initialPortfolio, redemptionStressPct: 2, cashBufferAmount: 5 },
      aggregateInstitutionExposures(initialBanks, initialHoldings),
      initialQuotes,
      initialHoldings,
    ),
  );
  const result: ModelResult =
    portfolio.tradeMode === 'subscription' && stress.error
      ? {
          ok: false,
          tradeMode: 'subscription',
          messages: [stress.error],
          postAum: stress.baseAum,
        }
      : storedResult;
  const [dirty, setDirty] = useState(false);
  const [frontierMode, setFrontierMode] = useState<FrontierMode>('wam');
  const [targetYtm, setTargetYtm] = useState<number | null>(null);
  const [targetYtmError, setTargetYtmError] = useState<string | null>(null);
  const [targetYtmMessage, setTargetYtmMessage] = useState<string | null>(null);
  const stateRef = useRef({
    portfolio,
    banks: modelBanks,
    quotes,
    holdings,
  });

  useEffect(() => {
    stateRef.current = { portfolio, banks: modelBanks, quotes, holdings };
  }, [portfolio, modelBanks, quotes, holdings]);

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
        title: t('计算当前 MMF 配置'),
        description: t(
          '使用页面当前填写的组合、当前持仓、机构上限、交易方向和报价，计算申购配置或同比例赎回影响。',
        ),
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
            current.holdings,
          );
          setResult(nextResult);
          setDirty(false);
          if (!nextResult.ok) {
            return {
              ok: false,
              tradeMode: nextResult.tradeMode,
              postAum: nextResult.postAum,
              messages: nextResult.messages.map(t),
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
              holdings: nextResult.holdings.map((holding) => ({
                product: holding.name,
                institution:
                  holding.bankId === null
                    ? null
                    : current.banks.find((bank) => bank.id === holding.bankId)
                        ?.name,
                redeemed: holding.redeemed,
                finalAmount: holding.finalAmount,
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
  }, [t]);

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
  const holdingErrors = useMemo(
    () => holdingValidationErrors(portfolio, banks, holdings),
    [portfolio, banks, holdings],
  );
  const holdingNameInvalidIds = new Set(
    holdings
      .filter((holding) => !holding.name.trim())
      .map((holding) => holding.id),
  );
  const holdingAmountInvalidIds = new Set(
    holdings
      .filter(
        (holding) => !Number.isFinite(holding.amount) || holding.amount < 0,
      )
      .map((holding) => holding.id),
  );
  const bankIds = new Set(banks.map((bank) => bank.id));
  const holdingBankInvalidIds = new Set(
    holdings
      .filter(
        (holding) => holding.bankId !== null && !bankIds.has(holding.bankId),
      )
      .map((holding) => holding.id),
  );
  const holdingTotal = holdings.reduce(
    (sum, holding) =>
      sum + (Number.isFinite(holding.amount) ? holding.amount : 0),
    0,
  );
  const holdingTotalError =
    holdingErrors.find((message) => message.startsWith('当前持仓合计')) ?? null;
  const holdingBalanceDifference = portfolio.aum - holdingTotal;
  const canFillHoldingShortfall =
    holdings.every(
      (holding) => Number.isFinite(holding.amount) && holding.amount >= 0,
    ) &&
    Number.isFinite(portfolio.aum) &&
    holdingBalanceDifference > amountTolerance(holdingTotal, portfolio.aum);
  const previewRedemptionRatio =
    isRedemption &&
    holdingErrors.length === 0 &&
    Number.isFinite(portfolio.aum) &&
    portfolio.aum > 0 &&
    Number.isFinite(portfolio.transactionAmount) &&
    portfolio.transactionAmount >= 0 &&
    portfolio.transactionAmount < portfolio.aum
      ? portfolio.transactionAmount / portfolio.aum
      : null;
  const previewHoldingOutcomeById = new Map(
    (previewRedemptionRatio === null
      ? []
      : buildProRataHoldingOutcomes(
          holdings,
          portfolio.transactionAmount,
          portfolio.aum,
        )
    ).map((holding) => [holding.id, holding]),
  );
  const bankExposureInvalidIds = new Set(
    modelBanks
      .filter(
        (bank) =>
          !Number.isFinite(bank.currentExposure) || bank.currentExposure < 0,
      )
      .map((bank) => bank.id),
  );
  const currentBankExposureBreachIds = new Set(
    modelBanks
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
        modelBanks
          .filter(
            (bank) =>
              Number.isFinite(postAum) &&
              postAum > 0 &&
              !bankConcentrationError(bank.limitPct) &&
              Number.isFinite(bank.currentExposure) &&
              postTradeExistingExposure(portfolio, bank.currentExposure) >
                ((isRedemption ? postAum : stress.stressedAum) *
                  bank.limitPct) /
                  100 +
                  EPSILON,
          )
          .map((bank) => bank.id),
      );
  const bankExposureTotalError = institutionExposureTotalError(
    portfolio,
    modelBanks,
  );
  const hasHoldingsWorkspaceViolation = Boolean(
    banks.some((bank) => bankConcentrationError(bank.limitPct)) ||
    bankExposureInvalidIds.size ||
    bankExposureBreachIds.size ||
    bankExposureTotalError ||
    holdingErrors.length,
  );
  const hasRegulatoryLimitViolation = Boolean(
    currentWamInputError ||
    currentWalInputError ||
    aumInputError ||
    transactionAmountError ||
    maxWamError ||
    maxWalError ||
    hasHoldingsWorkspaceViolation,
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
      isRedemption || hasHoldingsWorkspaceViolation
        ? { wam: [], wal: [] }
        : {
            wam: buildFrontier('wam', portfolio, modelBanks, quotes),
            wal: buildFrontier('wal', portfolio, modelBanks, quotes),
          },
    [
      portfolio,
      modelBanks,
      quotes,
      isRedemption,
      hasHoldingsWorkspaceViolation,
    ],
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
  const updateStress = (mode: 'percent' | 'amount', value: number | null) => {
    setPortfolio((old) =>
      mode === 'amount'
        ? { ...old, redemptionStressAmount: value ?? Number.NaN }
        : {
            ...old,
            redemptionStressPct: value ?? Number.NaN,
            redemptionStressAmount: null,
          },
    );
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
  const updateHolding = (holdingId: string, patch: Partial<Holding>) => {
    setHoldings((old) =>
      old.map((holding) =>
        holding.id === holdingId ? { ...holding, ...patch } : holding,
      ),
    );
    setDirty(true);
    clearTargetOutcome();
  };
  const addHolding = () => {
    setHoldings((old) => [
      ...old,
      {
        id: id('holding'),
        name: '',
        bankId: UNASSIGNED_BANK_ID,
        amount: 0,
      },
    ]);
    setDirty(true);
    clearTargetOutcome();
  };
  const fillHoldingShortfall = () => {
    if (!canFillHoldingShortfall) return;
    setHoldings((old) => {
      const otherIndex = old.findIndex((holding) => holding.isBalancing);
      if (otherIndex < 0) {
        return [
          ...old,
          {
            id: id('holding-other'),
            name: t('其他不计单一实体集中度资产'),
            bankId: null,
            amount: holdingBalanceDifference,
            isBalancing: true,
          },
        ];
      }
      return old.map((holding, index) =>
        index === otherIndex
          ? {
              ...holding,
              amount: holding.amount + holdingBalanceDifference,
            }
          : holding,
      );
    });
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
    setResult(calculatePlan(portfolio, modelBanks, quotes, holdings));
    setDirty(false);
    clearTargetOutcome();
  };
  const changeTradeMode = (tradeMode: TradeMode) => {
    const nextPortfolio = { ...portfolio, tradeMode };
    setPortfolio(nextPortfolio);
    setResult(calculatePlan(nextPortfolio, modelBanks, quotes, holdings));
    setDirty(false);
    setTargetYtm(null);
    clearTargetOutcome();
  };
  const reset = () => {
    setPortfolio({ ...initialPortfolio, redemptionStressPct: 2 });
    setBanks(initialBanks);
    setHoldings(initialHoldings);
    setQuotes(initialQuotes);
    setResult(
      calculatePlan(
        { ...initialPortfolio, redemptionStressPct: 2, cashBufferAmount: 5 },
        aggregateInstitutionExposures(initialBanks, initialHoldings),
        initialQuotes,
        initialHoldings,
      ),
    );
    setDirty(false);
    setTargetYtm(null);
    setTargetYtmError(null);
    setTargetYtmMessage(null);
  };
  const selectFrontierDay = (mode: FrontierMode, day: number) => {
    if (isRedemption || holdingErrors.length) return;
    const nextPortfolio = {
      ...portfolio,
      ...(mode === 'wam' ? { maxWam: day } : { maxWal: day }),
    };
    setPortfolio(nextPortfolio);
    setResult(optimiseSubscription(nextPortfolio, modelBanks, quotes));
    setDirty(false);
    clearTargetOutcome();
  };
  const reverseTargetYtm = () => {
    if (isRedemption || holdingErrors.length) return;
    if (targetYtm === null || !Number.isFinite(targetYtm)) {
      setTargetYtmError('请输入有效的目标 YTM。');
      setTargetYtmMessage(null);
      return;
    }

    const solution = solveTargetYtm(
      frontierMode,
      targetYtm,
      portfolio,
      modelBanks,
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
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-800 bg-[#0b2431] text-white">
        <div className="mx-auto max-w-[1540px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <fieldset
              aria-label={t('界面语言')}
              className="inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5"
            >
              {localeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={locale === option.value}
                  aria-label={option.nativeLabel}
                  lang={option.value}
                  title={option.nativeLabel}
                  onClick={() => onLocaleChange(option.value)}
                  className={`min-w-9 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                    locale === option.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {option.shortLabel}
                </button>
              ))}
            </fieldset>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              aria-label={t(
                theme === 'dark' ? '切换至浅色模式' : '切换至深色模式',
              )}
              title={t(theme === 'dark' ? '切换至浅色模式' : '切换至深色模式')}
              onClick={onThemeToggle}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              {theme === 'dark' ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
              <span>{theme === 'dark' ? t('浅色') : t('深色')}</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-teal-400 text-[#0b2431]">
                <Calculator className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight">
                    {t('MMF 配置台')}
                  </h1>
                  <Badge className="border border-white/10 bg-white/10 text-teal-100">
                    {t('本地草案')}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-300">
                  {t(
                    workspaceView === 'holdings'
                      ? '集中维护持仓、机构归属与集中度上限'
                      : isRedemption
                        ? '测算同比例赎回后的组合与机构敞口'
                        : '在期限与机构集中度约束内，寻找最高收益配置',
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 px-3 py-1.5">
                {t('WAM 利率敏感度 · WAL 最终到期')}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">
                {t('金额字段 = 绝对金额 · % 字段 = 占比')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <nav
        aria-label={t('配置台工作区')}
        className="border-b border-border bg-card"
      >
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="inline-flex rounded-xl bg-muted p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={workspaceView === 'planner'}
              className={
                workspaceView === 'planner'
                  ? 'bg-card text-foreground shadow-sm hover:bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              }
              onClick={() => setWorkspaceView('planner')}
            >
              <Calculator />
              {t('配置测算')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={workspaceView === 'holdings'}
              className={
                workspaceView === 'holdings'
                  ? 'bg-card text-foreground shadow-sm hover:bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              }
              onClick={() => setWorkspaceView('holdings')}
            >
              <Landmark />
              {t('当前持仓与机构')}
              {hasHoldingsWorkspaceViolation ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-red-100 px-1 text-[11px] font-semibold text-red-700">
                  {holdingErrors.length || '!'}
                </span>
              ) : null}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              workspaceView === 'holdings'
                ? '持仓、合作机构库及集中度设置在此统一维护'
                : '组合参数、市场报价与优化结果',
            )}
          </p>
        </div>
      </nav>

      <div
        className={`mx-auto max-w-[1540px] gap-6 px-4 py-6 sm:px-6 lg:px-8 ${
          workspaceView === 'planner'
            ? 'grid xl:grid-cols-[minmax(0,1.15fr)_minmax(560px,0.85fr)]'
            : 'block'
        }`}
      >
        <div className="space-y-5">
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-border/60 bg-primary/5 px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">CASH BUFFER · {t('赎回压力')}</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {t('先留出赎回的空间')}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${stress.error ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
                >
                  {t(
                    stress.error
                      ? '无法计算'
                      : stress.remainingCash <= EPSILON
                        ? '现金恰好用尽'
                        : '现金可覆盖',
                  )}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  '压力比例以当前 AUM 为基数；仅动用现有现金，机构敞口按不减少保守测算。',
                )}
              </p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label={t('赎回压力比例')}
                  value={stress.pct}
                  suffix="%"
                  min={0}
                  onChange={(value) => updateStress('percent', value)}
                />
                <NumberField
                  label={t('赎回压力金额')}
                  value={stress.redemption}
                  suffix={amountUnit}
                  min={0}
                  onChange={(value) => updateStress('amount', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  '比例与金额自动换算，以最后编辑的一项为准。调整 AUM 时，该项保持不变。',
                )}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric
                  label={t('实际现金缓冲')}
                  value={`${number(stress.cash)} ${t(amountUnit)}`}
                  detail={`${percent(portfolio.aum > 0 ? (stress.cash / portfolio.aum) * 100 : 0)} · ${t('来自现金持仓，参考目标 5%')}`}
                />
                <Metric
                  label={t('压力赎回金额')}
                  value={`${number(stress.redemption)} ${t(amountUnit)}`}
                  detail={`${t('当前 AUM')} ${number(portfolio.aum)} × ${percent(stress.pct)}`}
                />
                <Metric
                  label={t('压力后 AUM')}
                  value={`${number(stress.stressedAum)} ${t(amountUnit)}`}
                  detail={t('配置基准 AUM 减去压力赎回')}
                  accent={!stress.error}
                />
                <Metric
                  label={t(
                    stress.remainingCash < 0 ? '现金缺口' : '压力后剩余现金',
                  )}
                  value={`${number(Math.abs(stress.remainingCash))} ${t(amountUnit)}`}
                  detail={t(
                    stress.remainingCash < 0
                      ? '需要识别 T+0 可赎回资产'
                      : '不包含定存及未来到期资产',
                  )}
                />
              </div>
              {stress.error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                >
                  {t(stress.error)}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('机构')}</TableHead>
                        <TableHead className="text-right">
                          {t('原金额上限')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('压力后上限')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('最多新增')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelBanks.map((bank) => {
                        const cap = (stress.stressedAum * bank.limitPct) / 100;
                        return (
                          <TableRow key={bank.id}>
                            <TableCell className="font-medium">
                              {bank.name}
                              <span className="ml-2 text-muted-foreground">
                                {percent(bank.limitPct)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {number((stress.baseAum * bank.limitPct) / 100)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {number(cap)}
                            </TableCell>
                            <TableCell
                              className={`text-right ${cap < bank.currentExposure ? 'text-destructive' : 'text-primary'}`}
                            >
                              {cap < bank.currentExposure
                                ? `${t('已超出')} ${number(bank.currentExposure - cap)}`
                                : number(cap - bank.currentExposure)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {t('金额单位：')}
                {t(amountUnit)} ·{' '}
                {t(
                  '压力后上限用于申购优化、收益前沿和目标收益反推；不改变机构适用上限比例。',
                )}
              </p>
              {workspaceView === 'planner' && (
                <Button
                  variant="outline"
                  onClick={() => setWorkspaceView('holdings')}
                >
                  {t('管理现金持仓')}
                  <ArrowRight />
                </Button>
              )}
            </div>
          </section>

          {workspaceView === 'planner' ? (
            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div>
                  <p className="eyebrow">{t('01 · 组合参数')}</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {t('当前组合与目标')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    {t('统一金额单位')}
                    <NativeSelect
                      aria-label={t('统一金额单位')}
                      size="sm"
                      value={amountUnit}
                      onChange={(event) =>
                        setAmountUnit(event.target.value as AmountUnit)
                      }
                      className="w-24"
                    >
                      {(['元', '万元', '百万元', '亿元'] as const).map(
                        (unit) => (
                          <NativeSelectOption value={unit} key={unit}>
                            {t(unit)}
                          </NativeSelectOption>
                        ),
                      )}
                    </NativeSelect>
                  </label>
                  <Badge variant="outline">
                    {t('交易后 AUM')}
                    {number(postAum)} {t(amountUnit)}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('今日资金方向')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(
                      isRedemption
                        ? '第一版按当前组合所有资产同比例赎回'
                        : '将新增资金配置到今日可投产品',
                    )}
                  </p>
                </div>
                <fieldset className="grid w-full grid-cols-2 rounded-xl bg-muted p-1 sm:w-auto">
                  <legend className="sr-only">{t('选择今日资金方向')}</legend>
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
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t(label)}
                    </button>
                  ))}
                </fieldset>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                <NumberField
                  label={t('当前 AUM（绝对金额）')}
                  value={portfolio.aum}
                  suffix={amountUnit}
                  min={0}
                  error={aumInputError}
                  onChange={(value) =>
                    updatePortfolio('aum', value ?? Number.NaN)
                  }
                />
                <NumberField
                  label={t(
                    isRedemption
                      ? '净赎回金额（绝对金额）'
                      : '新增待配置资金（绝对金额）',
                  )}
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
                  label={t('当前 YTM')}
                  value={portfolio.ytm}
                  suffix="%"
                  onChange={(value) =>
                    updatePortfolio('ytm', value ?? Number.NaN)
                  }
                />
                <NumberField
                  label={t('当前 WAM')}
                  value={portfolio.wam}
                  suffix={t('天')}
                  min={0}
                  error={currentWamInputError}
                  warning={currentWamWarning}
                  warningTone="red"
                  onChange={(value) =>
                    updatePortfolio('wam', value ?? Number.NaN)
                  }
                />
                <NumberField
                  label={t('当前 WAL')}
                  value={portfolio.wal}
                  suffix={t('天')}
                  min={0}
                  error={currentWalInputError}
                  warning={currentWalWarning}
                  warningTone="red"
                  onChange={(value) =>
                    updatePortfolio('wal', value ?? Number.NaN)
                  }
                />
                <NumberField
                  label={t(isRedemption ? 'WAM 上限（合规检验）' : 'WAM 上限')}
                  value={portfolio.maxWam}
                  suffix={t('天')}
                  optional
                  min={0}
                  max={SFC_MAX_WAM_DAYS}
                  error={maxWamError}
                  onChange={(value) => updatePortfolio('maxWam', value)}
                />
                <NumberField
                  label={t(isRedemption ? 'WAL 上限（合规检验）' : 'WAL 上限')}
                  value={portfolio.maxWal}
                  suffix={t('天')}
                  optional
                  min={0}
                  max={SFC_MAX_WAL_DAYS}
                  error={maxWalError}
                  onChange={(value) => updatePortfolio('maxWal', value)}
                />
              </div>
              <p className="border-t border-border/60 px-5 py-3 text-xs leading-5 text-muted-foreground">
                {isRedemption ? (
                  <>
                    {t(
                      '所有金额都填写绝对金额并使用同一单位。交易后 AUM = 当前 AUM − 净赎回金额。当前版本假设所有资产及机构敞口按相同比例缩减，因此 YTM、WAM、WAL 与机构占比保持不变；已有超限也不会被修复。',
                    )}
                  </>
                ) : (
                  <>
                    {t(
                      '所有金额都填写绝对金额并使用同一单位。交易后 AUM = 当前 AUM + 新增待配置资金；新增资金尚未包含在当前 AUM 中。当前 WAM/WAL 是事实快照，超标时仍可录入以测算修复方案；目标留空时仍自动执行 SFC 监管上限 WAM 60 天、WAL 120 天。',
                    )}
                  </>
                )}
              </p>
            </section>
          ) : (
            <>
              <section className={card}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="eyebrow">{t('持仓工作区')}</p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {t('当前口径')}
                    </h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setWorkspaceView('planner')}
                  >
                    {t('修改组合参数')}
                    <ArrowRight />
                  </Button>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label={t('当前 AUM')}
                    value={`${number(portfolio.aum)} ${t(amountUnit)}`}
                    detail={t('持仓金额需与此口径对账')}
                  />
                  <Metric
                    label={t('持仓合计')}
                    value={`${number(holdingTotal)} ${t(amountUnit)}`}
                    detail={
                      holdingTotalError ? t('尚未完成对账') : t('已与 AUM 对账')
                    }
                    accent={!holdingTotalError}
                  />
                  <Metric
                    label={t('当前交易方向')}
                    value={t(isRedemption ? '净赎回' : '净申购')}
                    detail={t('交易方向在配置测算界面修改')}
                  />
                  <Metric
                    label={t(isRedemption ? '净赎回金额' : '新增资金')}
                    value={`${number(portfolio.transactionAmount)} ${t(amountUnit)}`}
                    detail={t('用于预览交易后的机构集中度')}
                  />
                </div>
              </section>

              <section className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="eyebrow">{t('01 · 当前持仓')}</p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {t('当前持仓明细')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        '机构敞口从这里自动汇总；净赎回时按每项持仓同比例测算。',
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={holdingErrors.length ? 'destructive' : 'outline'}
                    >
                      {t(
                        holdingErrors.length
                          ? `持仓数据需修正（${holdingErrors.length}）`
                          : `已录入 ${number(holdingTotal)} / AUM ${number(portfolio.aum)} ${amountUnit}`,
                      )}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addHolding}
                    >
                      <Plus />
                      {t('新增持仓')}
                    </Button>
                  </div>
                </div>

                {holdingTotalError ? (
                  <div className="border-b border-border/60 px-5 py-4">
                    <Alert variant="destructive">
                      <AlertTriangle />
                      <div>
                        <AlertTitle>{t(holdingTotalError)}</AlertTitle>
                        {canFillHoldingShortfall ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 border-red-300 bg-card text-red-800 hover:bg-red-50 dark:hover:bg-red-950/45"
                            onClick={fillHoldingShortfall}
                          >
                            {t('用其他资产补足（不计入现金缓冲）')}{' '}
                            {number(holdingBalanceDifference, 8)}{' '}
                            {t(amountUnit)}
                          </Button>
                        ) : null}
                      </div>
                    </Alert>
                  </div>
                ) : null}

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="min-w-52 pl-5">
                        {t('资产 / 产品')}
                      </TableHead>
                      <TableHead className="min-w-52">
                        {t('集中度归属机构')}
                      </TableHead>
                      <TableHead className="min-w-32 text-right">
                        {t('当前金额')}
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t('绝对金额/')}
                          {t(amountUnit)}
                        </span>
                      </TableHead>
                      {isRedemption ? (
                        <>
                          <TableHead className="min-w-32 text-right">
                            {t('预计赎回')}
                            <span className="block text-[11px] font-normal text-muted-foreground/75">
                              {t('当前为同比例')}
                            </span>
                          </TableHead>
                          <TableHead className="min-w-32 text-right">
                            {t('赎回后金额')}
                            <span className="block text-[11px] font-normal text-muted-foreground/75">
                              {t('绝对金额/')}
                              {t(amountUnit)}
                            </span>
                          </TableHead>
                        </>
                      ) : null}
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((holding) => {
                      const nameInvalid = holdingNameInvalidIds.has(holding.id);
                      const amountInvalid = holdingAmountInvalidIds.has(
                        holding.id,
                      );
                      const bankInvalid = holdingBankInvalidIds.has(holding.id);
                      const previewOutcome = previewHoldingOutcomeById.get(
                        holding.id,
                      );
                      const redeemed = previewOutcome?.redeemed ?? Number.NaN;
                      const finalAmount =
                        previewOutcome?.finalAmount ?? Number.NaN;
                      return (
                        <TableRow key={holding.id}>
                          <TableCell
                            className={`min-w-52 pl-5 ${nameInvalid ? 'bg-red-50/90' : ''}`}
                          >
                            <div className="grid gap-1">
                              <Input
                                aria-label={t('持仓资产或产品名称')}
                                value={holding.name}
                                aria-invalid={nameInvalid || undefined}
                                className={
                                  nameInvalid
                                    ? 'border-red-300 bg-red-50 text-red-950'
                                    : 'bg-card'
                                }
                                onChange={(event) =>
                                  updateHolding(holding.id, {
                                    name: event.target.value,
                                  })
                                }
                              />
                              <NativeSelect
                                aria-label={t('持仓类型')}
                                disabled={holding.isBalancing}
                                value={holding.isCash ? 'cash' : 'asset'}
                                onChange={(event) =>
                                  updateHolding(holding.id, {
                                    isCash: event.target.value === 'cash',
                                  })
                                }
                              >
                                <option value="asset">{t('非现金资产')}</option>
                                <option value="cash">
                                  {t('现金 · 计入缓冲')}
                                </option>
                              </NativeSelect>
                              {nameInvalid ? (
                                <span
                                  role="alert"
                                  className="text-xs font-medium text-red-700"
                                >
                                  {t('请输入资产或产品名称。')}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell
                            className={`min-w-52 ${bankInvalid ? 'bg-red-50/90' : ''}`}
                          >
                            <div className="grid gap-1">
                              <NativeSelect
                                aria-label={t(
                                  `${holding.name || '某项持仓'}的集中度归属机构`,
                                )}
                                disabled={holding.isBalancing}
                                value={
                                  holding.bankId === null
                                    ? EXCLUDED_BANK_SELECT_VALUE
                                    : holding.bankId
                                }
                                aria-invalid={bankInvalid || undefined}
                                className={
                                  bankInvalid
                                    ? 'border-red-300 bg-red-50 text-red-950'
                                    : 'bg-card'
                                }
                                onChange={(event) =>
                                  updateHolding(holding.id, {
                                    bankId:
                                      event.target.value ===
                                      EXCLUDED_BANK_SELECT_VALUE
                                        ? null
                                        : event.target.value,
                                  })
                                }
                              >
                                <NativeSelectOption value={UNASSIGNED_BANK_ID}>
                                  {t('请选择归属机构')}
                                </NativeSelectOption>
                                <NativeSelectOption
                                  value={EXCLUDED_BANK_SELECT_VALUE}
                                >
                                  {t('无机构归属 / 不计入本工具统计（需确认）')}
                                </NativeSelectOption>
                                {banks.map((bank) => (
                                  <NativeSelectOption
                                    value={bank.id}
                                    key={bank.id}
                                  >
                                    {bank.name}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                              {holding.isBalancing ? (
                                <span className="text-xs font-medium text-amber-700">
                                  {t(
                                    '自动补差专用行；明确不计入本工具的机构集中度统计。',
                                  )}
                                </span>
                              ) : bankInvalid ? (
                                <span
                                  role="alert"
                                  className="text-xs font-medium text-red-700"
                                >
                                  {t('请选择机构，或明确选择不计入统计。')}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell
                            className={`min-w-32 ${amountInvalid ? 'bg-red-50/90' : ''}`}
                          >
                            <div className="grid gap-1">
                              <EditableNumberInput
                                aria-label={t(
                                  `${holding.name || '某项持仓'}当前金额，单位${amountUnit}`,
                                )}
                                value={holding.amount}
                                min={0}
                                step="0.01"
                                aria-invalid={amountInvalid || undefined}
                                className={`text-right ${
                                  amountInvalid
                                    ? 'border-red-300 bg-red-50 text-red-950'
                                    : 'bg-card'
                                }`}
                                onValueChange={(value) =>
                                  updateHolding(holding.id, {
                                    amount: value ?? Number.NaN,
                                  })
                                }
                              />
                              {amountInvalid ? (
                                <span
                                  role="alert"
                                  className="text-right text-xs font-medium text-red-700"
                                >
                                  {t('请输入非负金额。')}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          {isRedemption ? (
                            <>
                              <TableCell className="text-right font-semibold text-primary">
                                {number(redeemed)} {t(amountUnit)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-foreground/85">
                                {number(finalAmount)} {t(amountUnit)}
                              </TableCell>
                            </>
                          ) : null}
                          <TableCell>
                            <Button
                              type="button"
                              aria-label={t(
                                `删除${holding.name || '该项持仓'}`,
                              )}
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setHoldings((old) =>
                                  old.filter((item) => item.id !== holding.id),
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
                    {!holdings.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={isRedemption ? 6 : 4}
                          className="h-24 text-center text-sm text-muted-foreground"
                        >
                          {t(
                            '还没有持仓。请新增持仓，并使金额合计与当前 AUM 一致。',
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
                <p className="border-t border-border/60 px-5 py-3 text-xs leading-5 text-muted-foreground">
                  {t(
                    '持仓金额合计必须等于当前 AUM。选择“无机构归属 / 不计入本工具统计”仅表示该行不占用下方单一机构额度，须由合规确认；普通机构持仓不得归入此项。窄屏可左右滑动查看完整字段。',
                  )}
                  {isRedemption
                    ? t(' 当前显示的是同比例情景，不代表赎回优先级。')
                    : ''}
                </p>
              </section>

              <section className={card}>
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{t('02 · 机构集中度')}</p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {t('机构集中度汇总')}
                    </h2>
                  </div>
                  <Badge variant="outline">
                    {t('机构表')}
                    {banks.length}
                    {t('家 · 备选库')}
                    {bankLibrary.length}
                    {t('家')}
                  </Badge>
                </div>

                <div className="grid gap-4 border-b border-border/60 bg-muted/40 p-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t('合作机构备选库')}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t('选择后可用于持仓归属和今日报价')}
                        </p>
                      </div>
                      <Badge variant="secondary">{t('仅保存在本机')}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <NativeSelect
                        aria-label={t('从合作机构备选库选择')}
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
                          {t(
                            availableBankTemplates.length
                              ? '选择备选机构'
                              : '备选机构已全部加入',
                          )}
                        </NativeSelectOption>
                        {availableBankTemplates.map((bank) => (
                          <NativeSelectOption value={bank.id} key={bank.id}>
                            {bank.name}
                            {t('· 默认')}
                            {number(bank.defaultLimitPct)}%
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
                        <Plus />
                        {t('加入机构表')}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {t('新增合作机构')}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                      <label htmlFor="new-bank-name" className="grid gap-1">
                        <span className="text-xs text-muted-foreground">
                          {t('机构名称')}
                        </span>
                        <Input
                          id="new-bank-name"
                          aria-label={t('新增合作机构名称')}
                          value={newBankName}
                          placeholder={t('例如：机构 F')}
                          onChange={(event) =>
                            setNewBankName(event.target.value)
                          }
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
                        <span className="text-xs text-muted-foreground">
                          {t('默认上限（%）')}
                        </span>
                        <EditableNumberInput
                          id="new-bank-limit"
                          aria-label={t('新增合作机构默认集中度上限百分比')}
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
                                ? 'border-yellow-300 bg-yellow-50 text-foreground'
                                : ''
                          }`}
                        />
                        {newBankLimitError ? (
                          <span
                            role="alert"
                            className="text-xs font-medium leading-4 text-red-600"
                          >
                            {t(newBankLimitError)}
                          </span>
                        ) : newBankLimitNotice ? (
                          <span className="text-xs font-medium leading-4 text-yellow-800">
                            {t(newBankLimitNotice)}
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
                          {t('存入备选库')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {bankExposureTotalError ? (
                  <div className="border-b border-border/60 px-5 py-4">
                    <Alert variant="destructive">
                      <AlertTriangle />
                      <AlertTitle>{t(bankExposureTotalError)}</AlertTitle>
                    </Alert>
                  </div>
                ) : null}

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="pl-5">{t('机构')}</TableHead>
                      <TableHead className="text-right">
                        {t('当前机构敞口')}
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t('从持仓自动汇总/')}
                          {t(amountUnit)}
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        {t(isRedemption ? '赎回后占比（不变）' : '当前占比')}
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t(isRedemption ? '与当前占比相同' : '占当前 AUM')}
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        {t('适用集中度上限')}
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t('合规确认 · 占交易后 NAV/%')}
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        {t(isRedemption ? '赎回后持仓' : '压力后额度上限')}
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t('绝对金额/')}
                          {t(amountUnit)}
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        {t(isRedemption ? '预计同比例赎回' : '本次最多可新增')}
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t('绝对金额/')}
                          {t(amountUnit)}
                        </span>
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelBanks.map((bank) => {
                      const concentrationError = bankConcentrationError(
                        bank.limitPct,
                      );
                      const concentrationNotice = bankConcentrationNotice(
                        bank.limitPct,
                      );
                      const finalCap = concentrationError
                        ? Number.NaN
                        : ((isRedemption
                            ? postAum
                            : stress.error
                              ? Number.NaN
                              : stress.stressedAum) *
                            bank.limitPct) /
                          100;
                      const postTradeExposure = postTradeExistingExposure(
                        portfolio,
                        bank.currentExposure,
                      );
                      const remaining = Math.max(
                        0,
                        finalCap - postTradeExposure,
                      );
                      const redeemed = Math.max(
                        0,
                        bank.currentExposure - postTradeExposure,
                      );
                      const linkedQuoteCount = quotes.filter(
                        (quote) => quote.bankId === bank.id,
                      ).length;
                      const hasQuotes = linkedQuoteCount > 0;
                      const linkedHoldingCount = holdings.filter(
                        (holding) => holding.bankId === bank.id,
                      ).length;
                      const hasHoldings = linkedHoldingCount > 0;
                      const referenceSummary = [
                        hasHoldings ? `${linkedHoldingCount} 项持仓` : null,
                        hasQuotes ? `${linkedQuoteCount} 项报价` : null,
                      ]
                        .filter(Boolean)
                        .join('和');
                      const exposureInvalid = bankExposureInvalidIds.has(
                        bank.id,
                      );
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
                            <p className="font-medium text-foreground">
                              {bank.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground/75">
                              {linkedHoldingCount}
                              {t('项持仓 ·')}
                              {linkedQuoteCount} {t('项报价')}
                            </p>
                          </TableCell>
                          <TableCell
                            className={`min-w-28 align-top ${exposureHighlight ? 'bg-red-50/90' : ''}`}
                          >
                            <div className="grid gap-1">
                              <p className="text-right font-semibold tabular-nums text-foreground">
                                {number(bank.currentExposure)} {t(amountUnit)}
                              </p>
                              <p className="text-right text-[11px] text-muted-foreground/75">
                                {t('由')}
                                {linkedHoldingCount}
                                {t('项持仓自动汇总')}
                              </p>
                              {exposureInvalid ? (
                                <span className="block max-w-44 whitespace-normal text-xs font-medium leading-4 text-red-700">
                                  {t('请先修正对应持仓金额。')}
                                </span>
                              ) : postTradeExposureBreach ? (
                                <span className="block max-w-44 whitespace-normal text-xs font-medium leading-4 text-red-700">
                                  {isRedemption ? (
                                    <>
                                      {t(
                                        '同比例赎回后占比不变，仍超过适用上限。',
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {t('计入新增资金后仍超过适用上限')}{' '}
                                      {number(finalCap)} {t(amountUnit)}
                                      {t('。')}
                                    </>
                                  )}
                                </span>
                              ) : currentExposureBreach ? (
                                <span className="block max-w-44 whitespace-normal text-xs font-medium leading-4 text-red-700">
                                  {t(
                                    '当前占比超限；计入新增资金后可稀释至上限内。',
                                  )}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell
                            className={`text-right text-foreground/75 ${
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
                                aria-label={t(
                                  `${bank.name}经合规确认的适用集中度上限`,
                                )}
                                min={0}
                                max={SFC_MAX_BANK_CONCENTRATION_PCT}
                                step="0.01"
                                value={bank.limitPct}
                                onValueChange={(value) =>
                                  updateBank(bank.id, {
                                    limitPct: value ?? Number.NaN,
                                  })
                                }
                                aria-invalid={
                                  concentrationError ? true : undefined
                                }
                                className={`text-right ${
                                  concentrationError
                                    ? 'border-red-300 bg-red-50 text-red-950'
                                    : concentrationNotice
                                      ? 'border-yellow-300 bg-yellow-50 text-foreground'
                                      : ''
                                }`}
                              />
                              {concentrationError ? (
                                <span
                                  role="alert"
                                  className="block max-w-52 whitespace-normal text-xs font-medium leading-4 text-red-600"
                                >
                                  {t(concentrationError)}
                                </span>
                              ) : concentrationNotice ? (
                                <span className="block max-w-52 whitespace-normal text-xs font-medium leading-4 text-yellow-800">
                                  {t(concentrationNotice)}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground/85">
                            {number(
                              isRedemption ? postTradeExposure : finalCap,
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {number(isRedemption ? redeemed : remaining)}
                          </TableCell>
                          <TableCell>
                            <Button
                              aria-label={t(`将${bank.name}移出机构表`)}
                              title={
                                hasHoldings || hasQuotes
                                  ? t(
                                      `该机构仍被${referenceSummary}使用；请先改绑或删除关联记录`,
                                    )
                                  : t('移出机构表，但保留在合作机构备选库')
                              }
                              variant="ghost"
                              size="icon-sm"
                              disabled={hasHoldings || hasQuotes}
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
                    {!modelBanks.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-20 text-center text-sm text-muted-foreground"
                        >
                          {t(
                            '请先从合作机构备选库加入需要用于持仓或报价的机构。',
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
                <div className="border-t border-border/60 px-5 py-3 text-xs leading-5 text-muted-foreground">
                  <p>
                    {isRedemption ? (
                      <>
                        {t(
                          '赎回后持仓 = 当前持仓 ×（交易后 AUM ÷ 当前 AUM）；同比例赎回金额 = 当前持仓 − 赎回后持仓。机构占比不会因同比例赎回改变。',
                        )}
                      </>
                    ) : (
                      <>
                        {t(
                          '当前占比 = 当前机构敞口 ÷ 当前 AUM；交易后额度上限 =（当前 AUM + 新增待配置资金）× 集中度上限；本次最多可新增 = 交易后额度上限 − 当前机构敞口。',
                        )}
                      </>
                    )}
                  </p>
                  {quotes.length ||
                  holdings.some(
                    (holding) =>
                      holding.bankId !== null &&
                      holding.bankId !== UNASSIGNED_BANK_ID &&
                      bankIds.has(holding.bankId),
                  ) ? (
                    <div className="mt-1">
                      <p>
                        {t(
                          '被持仓或报价引用的机构不能直接移除；持仓请先在上方改绑，关联报价请返回配置测算界面删除。',
                        )}
                        {isRedemption
                          ? t(' 当前为净赎回模式，需先切换至净申购后查看报价。')
                          : ''}
                      </p>
                      {quotes.length ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 bg-card"
                          onClick={() => setWorkspaceView('planner')}
                        >
                          {t('返回配置测算查看报价')}
                          <ArrowRight />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-1">
                    {t(
                      '同一机构的全部产品合并占用额度。单一实体一般上限为 10%；仅当该实体为符合条件的实质金融机构，并经合规确认满足 8.2(g)(i) 条件时才可提高至 25%。本工具假设 AUM 等于集中度计算使用的 NAV。',
                    )}
                  </p>
                </div>
              </section>
            </>
          )}

          {workspaceView === 'planner' ? (
            <>
              <section className={card}>
                <div className="section-head">
                  <div>
                    <p className="eyebrow">
                      02 · {t(isRedemption ? '赎回规则' : '市场报价')}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {t(
                        isRedemption
                          ? '按现有组合同比例赎回'
                          : '今日可投产品与报价',
                      )}
                    </h2>
                  </div>
                  {isRedemption ? (
                    <Badge className="bg-accent text-primary">
                      {t('不使用今日报价')}
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
                            name: t('新产品'),
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
                      <Plus />
                      {t('添加报价')}
                    </Button>
                  )}
                </div>
                {isRedemption ? (
                  <div className="p-5">
                    <div className="rounded-xl border border-primary/35 bg-accent/60 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        {t('当前版本不选择具体赎回产品')}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground/75">
                        {t(
                          '系统按“净赎回金额 ÷ 当前 AUM”的比例，同步缩减现有组合中的所有资产和机构敞口。因此 YTM、WAM、WAL 与机构占比保持不变。',
                        )}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {t(
                          '“当前持仓”界面会逐项列出预计赎回额和剩余金额；当前仍不判断赎回优先级。后续可在这张底表上增加产品级收益、期限和可赎回额度，再优化具体来源。',
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="pl-5">{t('产品')}</TableHead>
                          <TableHead>{t('机构')}</TableHead>
                          <TableHead className="text-right">
                            {t('WAM/天')}
                          </TableHead>
                          <TableHead className="text-right">
                            {t('WAL/天')}
                          </TableHead>
                          <TableHead className="text-right">
                            {t('利率/%')}
                          </TableHead>
                          <TableHead className="text-right">
                            {t('本次可投上限')}
                            <span className="block text-[11px] font-normal text-muted-foreground/75">
                              {t('绝对金额/')}
                              {t(amountUnit)}
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
                                aria-label={t('产品名称')}
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
                                aria-label={t(`${quote.name}机构`)}
                                value={quote.bankId}
                                onChange={(event) =>
                                  updateQuote(quote.id, {
                                    bankId: event.target.value,
                                  })
                                }
                                className="w-full"
                              >
                                {banks.map((bank) => (
                                  <NativeSelectOption
                                    value={bank.id}
                                    key={bank.id}
                                  >
                                    {bank.name}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                            </TableCell>
                            <TableCell className="min-w-24">
                              <EditableNumberInput
                                aria-label={t(`${quote.name}计入WAM的天数`)}
                                value={quote.wamDays}
                                placeholder={t('同 WAL')}
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
                                aria-label={t(`${quote.name}计入WAL的天数`)}
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
                                  aria-label={t(`${quote.name}${inputLabel}`)}
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
                                aria-label={t(`删除${quote.name}`)}
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
                    <p className="border-t border-border/60 px-5 py-3 text-xs leading-5 text-muted-foreground">
                      {t(
                        'WAL 填剩余最终到期天数。WAM 留空时自动按 WAL 处理；仅在已确认浮息工具可按下一次利率重定价计量时，填写更短的 WAM 天数。报价额度与 AUM 使用同一绝对金额单位。',
                      )}
                    </p>
                  </>
                )}
              </section>

              {hasRegulatoryLimitViolation ? (
                <Alert variant="destructive" aria-live="assertive">
                  <AlertTriangle />
                  <div>
                    <AlertTitle>
                      {t(
                        hasHoldingsWorkspaceViolation
                          ? '当前持仓或机构集中度数据需修正，完成后才能继续计算。'
                          : '存在超出监管硬上限或无效输入，请先修正上方提示。',
                      )}
                    </AlertTitle>
                    {hasHoldingsWorkspaceViolation ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 border-red-300 bg-card text-red-800 hover:bg-red-50 dark:hover:bg-red-950/45"
                        onClick={() => setWorkspaceView('holdings')}
                      >
                        {t('前往当前持仓处理')}
                        <ArrowRight />
                      </Button>
                    ) : null}
                  </div>
                </Alert>
              ) : null}

              <div
                className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4 text-primary" />
                  {t(
                    isRedemption
                      ? '按现有组合同比例扣减；不使用市场报价'
                      : '连续金额优化；未配置资金按零期限、零收益现金处理',
                  )}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={reset}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCcw />
                    {t('恢复示例')}
                  </Button>
                  <Button
                    size="lg"
                    onClick={calculate}
                    disabled={hasRegulatoryLimitViolation}
                    className="w-full bg-primary px-5 text-primary-foreground hover:bg-primary/90 sm:w-auto"
                  >
                    {t(isRedemption ? '测算赎回后组合' : '计算最优配置')}{' '}
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {workspaceView === 'planner' ? (
          <aside className="xl:self-start">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:shadow-black/25">
              <div className="flex items-start justify-between border-b border-border/60 px-5 py-4">
                <div>
                  <p className="eyebrow">{t('决策面板')}</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {t(isRedemption ? '赎回后组合快照' : '收益前沿与推荐配置')}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      isRedemption
                        ? '按现有组合同比例缩减；结果以最近一次测算为准'
                        : '前沿随输入实时更新；配置结果以最近一次计算为准',
                    )}
                  </p>
                </div>
                {hasRegulatoryLimitViolation ? (
                  <Badge variant="destructive">{t('监管/输入需修正')}</Badge>
                ) : dirty ? (
                  <Badge className="bg-amber-100 text-amber-800">
                    {t('待重新计算')}
                  </Badge>
                ) : result.ok ? (
                  <Badge className="bg-emerald-100 text-emerald-800">
                    <Check />
                    {t('约束通过')}
                  </Badge>
                ) : (
                  <Badge variant="destructive">{t('输入需调整')}</Badge>
                )}
              </div>

              {isRedemption ? (
                <div className="border-b border-border/60 p-5">
                  <div className="rounded-xl border border-primary/35 bg-accent/60 p-4">
                    <p className="eyebrow">{t('赎回影响')}</p>
                    <h3 className="mt-1 text-base font-semibold">
                      {t('同比例赎回不改变期限与收益指标')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-foreground/75">
                      {t(
                        '本模式没有新的买入配置，因此不展示收益前沿或目标 YTM 反推。交易后结果仅由赎回金额和当前组合快照决定。',
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-b border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                    <div>
                      <p className="eyebrow">{t('收益前沿')}</p>
                      <h3 className="mt-1 flex items-center gap-2 text-base font-semibold">
                        <TrendingUp className="size-4 text-primary" />
                        {t('多一天期限，换来多少收益')}
                      </h3>
                    </div>
                    <div
                      className="inline-flex rounded-xl bg-muted p-1"
                      role="tablist"
                      aria-label={t('选择期限指标')}
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
                              ? 'bg-card text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {mode.toUpperCase()}
                          {t('曲线')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div
                    id="frontier-panel"
                    role="tabpanel"
                    aria-labelledby={`${frontierMode}-frontier-tab`}
                  >
                    {hasHoldingsWorkspaceViolation ? (
                      <div className="p-5">
                        <Alert variant="destructive">
                          <AlertTriangle />
                          <div>
                            <AlertTitle>
                              {t(
                                '请先修正“当前持仓”中的持仓或机构数据，随后再生成收益前沿。',
                              )}
                            </AlertTitle>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-3 border-red-300 bg-card text-red-800 hover:bg-red-50 dark:hover:bg-red-950/45"
                              onClick={() => setWorkspaceView('holdings')}
                            >
                              {t('前往当前持仓处理')}
                              <ArrowRight />
                            </Button>
                          </div>
                        </Alert>
                      </div>
                    ) : (
                      <FrontierPanel
                        mode={frontierMode}
                        points={frontiers[frontierMode]}
                        currentLimit={
                          frontierMode === 'wam'
                            ? portfolio.maxWam
                            : portfolio.maxWal
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
                    )}
                  </div>
                </div>
              )}

              <div className="border-b border-border/60 px-5 py-4">
                <p className="eyebrow">
                  {t(isRedemption ? '测算结果' : '最优解')}
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  {t(isRedemption ? '同比例赎回结果' : '推荐配置')}
                </h3>
              </div>

              {hasRegulatoryLimitViolation ? (
                <div className="p-5">
                  <Alert variant="destructive" className="p-4">
                    <AlertTriangle />
                    <AlertTitle>
                      {t(
                        isRedemption
                          ? '赎回测算已暂时隐藏。请先修正标红字段，再重新测算。'
                          : '推荐配置已暂时隐藏。请先修正标红字段，再重新计算。',
                      )}
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
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/35 bg-accent/60 px-4 py-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('本次赎回比例')}
                          </p>
                          <p className="mt-0.5 text-sm text-foreground/75">
                            {t('净赎回金额 ÷ 当前 AUM')}
                          </p>
                        </div>
                        <p className="text-xl font-semibold tabular-nums text-primary">
                          {percent(result.redemptionRatio * 100, 2)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                    <Metric
                      label={t('交易后 AUM')}
                      value={`${number(result.postAum)} ${t(amountUnit)}`}
                      detail={t(
                        `${result.tradeMode === 'redemption' ? '赎回' : '新增'} ${number(result.transactionAmount)} ${amountUnit}`,
                      )}
                    />
                    <Metric
                      label={t('交易后 YTM')}
                      value={percent(result.postYtm, 3)}
                      detail={
                        result.tradeMode === 'redemption'
                          ? t('同比例赎回，与当前组合一致')
                          : t(`新增资金 ${percent(result.allocationYield, 3)}`)
                      }
                      accent
                    />
                    <Metric
                      label={t('交易后 WAM')}
                      value={`${number(result.postWam)}${t('天')}`}
                      detail={
                        result.tradeMode === 'redemption'
                          ? t('同比例赎回，与当前组合一致')
                          : t(`计算所用上限 ${number(result.appliedMaxWam)} 天`)
                      }
                    />
                    <Metric
                      label={t('交易后 WAL')}
                      value={`${number(result.postWal)}${t('天')}`}
                      detail={
                        result.tradeMode === 'redemption'
                          ? t('同比例赎回，与当前组合一致')
                          : t(`计算所用上限 ${number(result.appliedMaxWal)} 天`)
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
                              {t('仍有')}
                              {number(result.unallocated)} {t(amountUnit)}{' '}
                              {t('未配置，期限或额度约束已限制继续投资。')}
                            </AlertTitle>
                          </Alert>
                        </div>
                      ) : null}

                      <div className="border-t border-border/60">
                        <h3 className="flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                          {t('推荐金额与新增资金占比')}
                        </h3>
                        {result.allocations.length ||
                        result.unallocated > EPSILON ? (
                          <div className="divide-y divide-border/60">
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
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {bankNames.get(item.bankId)} · WAM/WAL{' '}
                                      {number(quoteWamDays(item), 0)}/
                                      {number(item.walDays, 0)}
                                      {t('天 ·')} {percent(item.rate)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold tabular-nums">
                                      {number(item.amount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground/75">
                                      {t(amountUnit)}
                                      {t('· 占新增资金')}{' '}
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
                                  <p className="text-sm font-medium">
                                    {t('保留现金')}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {t('零期限 · 零收益')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold tabular-nums">
                                    {number(result.unallocated)}
                                  </p>
                                  <p className="text-xs text-muted-foreground/75">
                                    {t(amountUnit)}
                                    {t('· 占新增资金')}{' '}
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
                          <p className="px-5 pb-4 text-sm text-muted-foreground">
                            {t('当前约束下没有正收益配置。')}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="border-t border-border/60 px-5 py-4">
                        <p className="text-sm font-semibold text-foreground">
                          {t('按比例缩减当前持仓')}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {t(
                            '下列金额来自当前持仓底表，合计等于本次净赎回金额；这是同比例情景，不代表赎回优先级。',
                          )}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground/75">
                          {t(
                            '明细按当前金额单位四舍五入展示，计算与合计使用未舍入数值。',
                          )}
                        </p>
                      </div>
                      <div className="divide-y divide-border/60 border-t border-border/60">
                        {result.holdings.map((holding) => (
                          <div
                            key={holding.id}
                            className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {holding.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {holding.bankId === null
                                  ? t('不计入单一实体集中度')
                                  : (bankNames.get(holding.bankId) ??
                                    t('机构待修正'))}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-sm font-semibold tabular-nums text-primary">
                                {t('赎回')}
                                {number(holding.redeemed)} {t(amountUnit)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground/75">
                                {t('剩余')}
                                {number(holding.finalAmount)} {t(amountUnit)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="border-t border-border/60">
                    <h3 className="flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                      <Landmark className="size-4 text-primary" />{' '}
                      {t(
                        result.tradeMode === 'redemption'
                          ? '机构同比例赎回明细'
                          : '交易后机构占比',
                      )}
                    </h3>
                    <div className="space-y-4 px-5 pb-5">
                      {result.banks.map((bank) => {
                        const used =
                          bank.limitPct > 0
                            ? Math.min(
                                100,
                                ((bank.stressedPct ?? bank.finalPct) /
                                  bank.limitPct) *
                                  100,
                              )
                            : 0;
                        const atLimit = bank.remaining <= EPSILON;
                        return (
                          <div key={bank.id}>
                            <div className="mb-1.5 flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
                              <span className="font-medium text-foreground/85">
                                {bank.name}
                              </span>
                              <span>
                                {percent(bank.finalPct)}
                                {bank.stressedPct !== undefined ? (
                                  <>
                                    {' '}
                                    → {percent(bank.stressedPct)}{' '}
                                    <span className="text-muted-foreground">
                                      {t('压力后')}
                                    </span>
                                  </>
                                ) : null}{' '}
                                / {percent(bank.limitPct)}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${
                                  atLimit ? 'bg-amber-500' : 'bg-primary'
                                }`}
                                style={{ width: `${used}%` }}
                              />
                            </div>
                            <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground/75 sm:flex-row sm:justify-between">
                              <span>
                                {result.tradeMode === 'redemption' ? (
                                  <>
                                    {t('赎回')}{' '}
                                    {number(Math.abs(bank.transactionChange))}{' '}
                                    {t(amountUnit)}
                                    {t('· 剩余')} {number(bank.finalExposure)}{' '}
                                    {t(amountUnit)}
                                  </>
                                ) : (
                                  <>
                                    {t('新增')}
                                    {number(bank.transactionChange)}{' '}
                                    {t(amountUnit)}
                                  </>
                                )}
                              </span>
                              <span>
                                {atLimit
                                  ? t('已触及配置金额上限')
                                  : t(
                                      `余量 ${number(bank.remaining)} ${amountUnit}`,
                                    )}
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
                      <AlertTitle>{t('当前输入没有可行解')}</AlertTitle>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                        {result.messages.map((message) => (
                          <li key={message}>{t(message)}</li>
                        ))}
                      </ul>
                    </div>
                  </Alert>
                </div>
              )}
            </section>
          </aside>
        ) : null}
      </div>
    </main>
  );
}

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function applyDocumentTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const storage = browserStorage();
    const savedLocale = readStoredPreference(
      storage,
      LOCALE_STORAGE_KEY,
      parseLocale,
      DEFAULT_LOCALE,
    );
    const savedTheme = readStoredPreference(
      storage,
      THEME_STORAGE_KEY,
      parseTheme,
      DEFAULT_THEME,
    );

    applyDocumentTheme(savedTheme);
    queueMicrotask(() => {
      setLocale(savedLocale);
      setTheme(savedTheme);
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = htmlLang(locale);
    document.title = translateText(locale, 'MMF 配置台');
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description) {
      description.content = translateText(
        locale,
        '基于收益、期限与机构敞口约束的货币市场基金配置规划器',
      );
    }
  }, [locale]);

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    writeStoredPreference(browserStorage(), LOCALE_STORAGE_KEY, nextLocale);
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyDocumentTheme(nextTheme);
    writeStoredPreference(browserStorage(), THEME_STORAGE_KEY, nextTheme);
  };

  return (
    <I18nProvider locale={locale}>
      <PlannerWorkspace
        locale={locale}
        theme={theme}
        onLocaleChange={changeLocale}
        onThemeToggle={toggleTheme}
      />
    </I18nProvider>
  );
}
