'use client';

import { QuoteImageImport } from '@/components/quote-image-import';
import { HoldingImport } from '@/components/holding-import';
import { DeepReviewButton } from '@/components/deep-review-button';
import { MathPrinciples } from '@/components/math-principles';
import { RateScenarioPanel } from '@/components/rate-scenario-panel';
import { emptyRateScenario, type RateScenario } from '@/lib/rate-strategy';
import { TermStructureEntry } from '@/components/term-structure-entry';
import { canEditSummary, MODE_DESCRIPTIONS, cashBufferPercentage, resolvePortfolio, editSummary, switchPortfolioMode, MODE_LABELS, SUMMARY_FIELDS, type InputMode, type SummaryField } from '@/lib/portfolio-input';
import { groupVersionsByMode, appendVersion, readVersions, renameVersion, deleteVersion, type SavedVersion } from '@/lib/workspace-versions';
import { decodeWorkspace, type WorkspaceSnapshot } from '@/lib/workspace-save';
import { parseQuoteTable } from '@/lib/quote-import';
import { quoteColumns, quoteColumnKey, updateExistingMatrixRate, type QuoteColumn } from '@/lib/quote-matrix';
import { concentrationBuckets, concentrationKey } from '@/lib/concentration-groups';
import { ConstraintNotes } from '@/components/constraint-notes';
import { InstitutionManager } from '@/components/institution-manager';
import { GROUP_STORAGE_KEY, groupsFromInstitutions, validGroups, applyGroupRegistry, renameGroupMembers, type InstitutionGroup } from '@/lib/group-registry';
import { syncBankLimits } from '@/lib/bank-limits';
import { holdingMetrics } from '@/lib/holding-metrics';
import { EditableNumberInput, NumberField, Metric } from '@/components/planner-fields';
import { FrontierPanel } from '@/components/frontier-panel';

import {
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
  ShieldCheck,
  Sun,
  TrendingUp,
  Trash2,
  Wallet,
} from 'lucide-react';


import { I18nProvider, useI18n } from '@/components/i18n-provider';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  type ModelBank,
  type BankTemplate,
  type AmountUnit,
  type Quote,
  type Holding,
  type ModelResult,
  type FrontierMode,
  type FrontierPoint,
  type WebModelContext,
  BANK_LIBRARY_STORAGE_KEY,
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

const FRONTIER_DEBOUNCE_MS = 180;
const emptyPortfolio: Portfolio = { tradeMode: 'subscription', aum: 0, ytm: 0, wam: 0, wal: 0, transactionAmount: 0, maxWam: null, maxWal: null, redemptionStressPct: 0, redemptionStressAmount: null, cashBufferAmount: 0 };

const card =
  'rounded-md border border-border bg-card shadow-none';

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
  const manualMetrics = useRef<Pick<Portfolio, 'aum' | 'ytm' | 'wam' | 'wal'> | null>(null);
  const cancelFocus = useRef<HTMLButtonElement>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [restoreVersionId, setRestoreVersionId] = useState<string | null>(null);
  const [renamingVersionId, setRenamingVersionId] = useState<string | null>(null);
  const [versionNameDraft, setVersionNameDraft] = useState('');
  const [restoreOpen, setRestoreOpen] = useState<false | 'restore' | 'delete'>(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('planner');
  const [portfolioInput, setPortfolio] = useState<Portfolio>({
    ...emptyPortfolio,
  });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [rateScenario, setRateScenario] = useState<RateScenario>(emptyRateScenario);
  const [holdingImportOpen, setHoldingImportOpen] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const simpleMode = portfolioInput.inputMode === 'simple';
  const aggregateMode = portfolioInput.inputMode === 'aggregate';
  const metrics = useMemo(() => holdingMetrics(holdings, aggregateMode), [holdings, aggregateMode]);
  const portfolio = useMemo(() => resolvePortfolio(portfolioInput, holdings), [portfolioInput, holdings]);
  const stress = redemptionStress(portfolio);
  const modelBanks = useMemo(
    () => aggregateInstitutionExposures(banks, simpleMode ? [] : holdings),
    [banks, holdings, simpleMode],
  );
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteImportText, setQuoteImportText] = useState('');
  const [quoteImportOpen, setQuoteImportOpen] = useState(false);
  const [quoteImportBankIds, setQuoteImportBankIds] = useState<string[] | null>(null);
  const quoteImportPreview = useMemo(() => { try { return { data: parseQuoteTable(quoteImportText), error: '' }; } catch (error) { return { data: null, error: error instanceof Error ? error.message : '导入失败' }; } }, [quoteImportText]);
  const [quoteView, setQuoteView] = useState<'matrix' | 'details'>('matrix');
  const matrixColumns = useMemo(() => quoteColumns(quotes), [quotes]);
  const [bankLibrary, setBankLibrary] = useState<BankTemplate[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [, setBankLibraryMessage] = useState('');
  const [bankLibraryLoaded, setBankLibraryLoaded] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankLimitPct, setNewBankLimitPct] = useState(10);
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('亿元');
  const [storedResult, setResult] = useState<ModelResult>(() =>
    calculatePlan(
      emptyPortfolio,
      [],
      [],
      [],
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
  const [frontiers, setFrontiers] = useState<{
    wam: FrontierPoint[];
    wal: FrontierPoint[];
    source?: { portfolio: Portfolio; banks: ModelBank[]; quotes: Quote[] };
  }>({
    wam: [],
    wal: [],
  });
  const stateRef = useRef({
    portfolio,
    banks: modelBanks,
    quotes,
    holdings,
  });
  const planCacheRef = useRef<{
    portfolio: Portfolio;
    modelBanks: ModelBank[];
    quotes: Quote[];
    holdings: Holding[];
    result: ModelResult;
  } | null>(null);
  const optimiseSubscriptionCacheRef = useRef<{
    portfolio: Portfolio;
    banks: ModelBank[];
    quotes: Quote[];
    result: ModelResult;
  } | null>(null);
  const frontierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frontierCacheRef = useRef<{
    portfolio: Portfolio;
    banks: ModelBank[];
    quotes: Quote[];
    points: {
      wam: FrontierPoint[];
      wal: FrontierPoint[];
    };
  } | null>(null);

  const calculatePlanCached = (
    nextPortfolio: Portfolio,
    nextBanks: ModelBank[],
    nextQuotes: Quote[],
    nextHoldings: Holding[],
  ): ModelResult => {
    const cached = planCacheRef.current;
    if (
      cached &&
      cached.portfolio === nextPortfolio &&
      cached.modelBanks === nextBanks &&
      cached.quotes === nextQuotes &&
      cached.holdings === nextHoldings
    ) {
      return cached.result;
    }

    const nextResult = calculatePlan(
      nextPortfolio,
      nextBanks,
      nextQuotes,
      nextHoldings,
    );
    planCacheRef.current = {
      portfolio: nextPortfolio,
      modelBanks: nextBanks,
      quotes: nextQuotes,
      holdings: nextHoldings,
      result: nextResult,
    };
    return nextResult;
  };

  const optimiseSubscriptionCached = (
    nextPortfolio: Portfolio,
    nextBanks: ModelBank[],
    nextQuotes: Quote[],
  ): ModelResult => {
    const cached = optimiseSubscriptionCacheRef.current;
    if (
      cached &&
      cached.portfolio === nextPortfolio &&
      cached.banks === nextBanks &&
      cached.quotes === nextQuotes
    ) {
      return cached.result;
    }

    const nextResult = optimiseSubscription(
      nextPortfolio,
      nextBanks,
      nextQuotes,
    );
    optimiseSubscriptionCacheRef.current = {
      portfolio: nextPortfolio,
      banks: nextBanks,
      quotes: nextQuotes,
      result: nextResult,
    };
    return nextResult;
  };

  useEffect(() => {
    stateRef.current = { portfolio, banks: modelBanks, quotes, holdings };
  }, [portfolio, modelBanks, quotes, holdings]);

  useEffect(() => {
    let cancelled = false;
    let parsed: BankTemplate[] | null = null;
    let parsedGroups: InstitutionGroup[] = [];
    try {
      const saved = window.localStorage.getItem(BANK_LIBRARY_STORAGE_KEY);
      parsed = saved ? parseBankLibrary(saved) : null;
      const groupData = window.localStorage.getItem(GROUP_STORAGE_KEY);
      const decoded = groupData ? JSON.parse(groupData) : null;
      parsedGroups = validGroups(decoded) ? decoded : groupsFromInstitutions(parsed ?? []);
    } catch {
      // The default library is used when browser storage is unavailable.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      if (parsed) setBankLibrary(applyGroupRegistry(parsed, parsedGroups));
      setGroups(parsedGroups);
      setBankLibraryLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bankLibraryLoaded) return;
    const library = applyGroupRegistry(bankLibrary, groups);
    const synced = applyGroupRegistry(syncBankLimits(banks, library), groups);
    let cancelled = false;
    if (synced !== banks || library !== bankLibrary) {
      queueMicrotask(() => {
        if (cancelled) return;
        setBanks(synced);
        setBankLibrary(library);
        setDirty(true);
        setTargetYtmError(null);
        setTargetYtmMessage(null);
      });
    }
    try {
      window.localStorage.setItem(BANK_LIBRARY_STORAGE_KEY, JSON.stringify(library));
      window.localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups));
    } catch {
      queueMicrotask(() => {
        if (!cancelled) setSaveMessage(t('保存失败：本机存储不可用或空间不足，原存档未覆盖。'));
      });
    }
    return () => { cancelled = true; };
  }, [bankLibrary, bankLibraryLoaded, banks, groups, t]);

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
          '使用页面当前填写的组合、当前持仓、机构上限和报价，计算申购配置。净赎回暂不可用。',
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
          const nextResult = calculatePlanCached(
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
    (portfolio.wam > portfolio.wal + EPSILON ? '当前组合 WAM 不能大于 WAL。' : null) ??
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
  const holdingErrors = useMemo(
    () => simpleMode ? [] : [...holdingValidationErrors(portfolio, banks, holdings),
      ...metrics.errors.map(name => `${t(aggregateMode ? '请补齐持仓收益率' : '请补齐持仓收益率与有效期限')}：${name}`)],
    [portfolio, banks, holdings, metrics, t, simpleMode, aggregateMode],
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
  const bankTemplateIds = useMemo(
    () =>
      new Set(
        banks
          .map((bank) => bank.templateId)
          .filter((templateId): templateId is string => templateId !== null),
      ),
    [banks],
  );
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
  const hasHoldingsWorkspaceViolation = !simpleMode && Boolean(
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
        (template) => !bankTemplateIds.has(template.id) && !banks.some(bank => bank.name.trim().toLocaleLowerCase('zh-CN') === template.name.trim().toLocaleLowerCase('zh-CN')),
      ),
    [bankLibrary, bankTemplateIds, banks],
  );
  const bankNames = useMemo(
    () => new Map(banks.map((bank) => [bank.id, bank.name])),
    [banks],
  );
  const bankHoldingCountById = useMemo(() => {
    const holdingCount = new Map<string, number>();
    banks.forEach((bank) => {
      holdingCount.set(bank.id, 0);
    });
    holdings.forEach((holding) => {
      if (holding.bankId !== null && holdingCount.has(holding.bankId)) {
        holdingCount.set(
          holding.bankId,
          (holdingCount.get(holding.bankId) ?? 0) + 1,
        );
      }
    });
    return holdingCount;
  }, [banks, holdings]);
  const bankQuoteCountById = useMemo(() => {
    const quoteCount = new Map<string, number>();
    banks.forEach((bank) => {
      quoteCount.set(bank.id, 0);
    });
    quotes.forEach((quote) => {
      if (quoteCount.has(quote.bankId)) {
        quoteCount.set(
          quote.bankId,
          (quoteCount.get(quote.bankId) ?? 0) + 1,
        );
      }
    });
    return quoteCount;
  }, [banks, quotes]);
  useEffect(() => {
    if (frontierTimerRef.current !== null) {
      clearTimeout(frontierTimerRef.current);
      frontierTimerRef.current = null;
    }

    if (isRedemption || hasHoldingsWorkspaceViolation) {
      return;
    }

    frontierTimerRef.current = setTimeout(() => {
      frontierTimerRef.current = null;
      const cached = frontierCacheRef.current;
      if (
        cached &&
        cached.portfolio === portfolio &&
        cached.banks === modelBanks &&
        cached.quotes === quotes
      ) {
        setFrontiers({ ...cached.points, source: { portfolio, banks: modelBanks, quotes } });
        return;
      }

      const nextFrontiers = {
        wam: buildFrontier('wam', portfolio, modelBanks, quotes),
        wal: buildFrontier('wal', portfolio, modelBanks, quotes),
      };
      frontierCacheRef.current = {
        portfolio,
        banks: modelBanks,
        quotes,
        points: nextFrontiers,
      };
      setFrontiers({ ...nextFrontiers, source: { portfolio, banks: modelBanks, quotes } });
    }, FRONTIER_DEBOUNCE_MS);

    return () => {
      if (frontierTimerRef.current !== null) {
        clearTimeout(frontierTimerRef.current);
        frontierTimerRef.current = null;
      }
    };
  }, [
    portfolio,
    modelBanks,
    quotes,
    isRedemption,
    hasHoldingsWorkspaceViolation,
  ]);
  const clearTargetOutcome = () => {
    setTargetYtmError(null);
    setTargetYtmMessage(null);
  };
  const updatePortfolio = <K extends keyof Portfolio>(
    key: K,
    value: Portfolio[K],
  ) => {
    setPortfolio((old) => (SUMMARY_FIELDS.includes(key as SummaryField) || key === 'cashBufferPct')
      ? editSummary(old, key as SummaryField | 'cashBufferPct', value as number)
      : { ...old, [key]: value });
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
  const saveWorkspace = () => {
    try {
      const snapshot: WorkspaceSnapshot = { version: 1, savedAt: new Date().toISOString(), portfolioInput, banks, holdings, quotes, bankLibrary, groups, amountUnit, workspaceView, rateScenario, quoteView, quoteImportText, quoteImportOpen, quoteImportBankIds, manualMetrics: manualMetrics.current, frontierMode, targetYtm, storedResult, dirty, locale, theme, newBankName, newBankLimitPct, editingBankId, targetYtmError, targetYtmMessage };
      const next = appendVersion(window.localStorage, snapshot, id('saved-version'));
      setVersions(next);
      setSavedAt(snapshot.savedAt);
      setSaveMessage(t('已保存为新版本，之前的版本已保留。'));
    } catch {
      setSaveMessage(t('保存失败：本机存储不可用或空间不足，原存档未覆盖。'));
    }
  };
  const restoreWorkspace = () => {
    try {
      const latest = readVersions(window.localStorage);
      const entry = latest.find(version => version.id === restoreVersionId);
      if (!entry) { setSaveMessage(t('找不到此版本，请重新选择。')); setRestoreOpen(false); return; }
      const saved = decodeWorkspace(entry.data);
      setVersions(latest);
      setPortfolio(saved.portfolioInput); setBanks(saved.banks); setHoldings(saved.holdings); setQuotes(saved.quotes);
      const restoredGroups = saved.groups ?? groupsFromInstitutions(saved.bankLibrary);
      setGroups(restoredGroups);
      setBankLibrary(applyGroupRegistry(saved.bankLibrary, restoredGroups)); setAmountUnit(saved.amountUnit); setWorkspaceView(saved.workspaceView);
      setRateScenario(saved.rateScenario ?? emptyRateScenario());
      setQuoteView(saved.quoteView); setQuoteImportText(saved.quoteImportText); setQuoteImportOpen(saved.quoteImportOpen); setQuoteImportBankIds(saved.quoteImportBankIds);
      manualMetrics.current = saved.manualMetrics; setFrontierMode(saved.frontierMode); setTargetYtm(saved.targetYtm);
      setResult(calculatePlan(resolvePortfolio(saved.portfolioInput, saved.holdings), aggregateInstitutionExposures(saved.banks, saved.portfolioInput.inputMode === 'simple' ? [] : saved.holdings), saved.quotes, saved.holdings)); setDirty(false); setNewBankName(saved.newBankName); setNewBankLimitPct(saved.newBankLimitPct); setEditingBankId(saved.editingBankId);
      setTargetYtmError(saved.targetYtmError); setTargetYtmMessage(saved.targetYtmMessage);
      setFrontiers({ wam: [], wal: [] }); frontierCacheRef.current = null; planCacheRef.current = null; optimiseSubscriptionCacheRef.current = null;
      if (frontierTimerRef.current) clearTimeout(frontierTimerRef.current);
      onLocaleChange(saved.locale); if (saved.theme !== theme) onThemeToggle();
      setSavedAt(saved.savedAt); setRestoreOpen(false); setSaveMessage(t('已恢复保存的全部内容')); setBankLibraryMessage('');
    } catch { setRestoreOpen(false); setSaveMessage(t('恢复失败：存档损坏或版本不兼容，当前内容未更改。')); }
  };
  const deleteSelectedVersion = () => {
    try {
      if (!restoreVersionId) return;
      const next = deleteVersion(window.localStorage, restoreVersionId);
      setVersions(next); setSavedAt(next[0]?.savedAt ?? null);
      if (renamingVersionId === restoreVersionId) setRenamingVersionId(null);
      setRestoreVersionId(null); setRestoreOpen(false);
      setSaveMessage(t('版本已删除，当前工作内容保持不变。'));
    } catch { setRestoreOpen(false); setSaveMessage(t('删除失败，存档未更改，请重试。')); }
  };
  const saveVersionName = (versionId: string) => {
    try {
      setVersions(renameVersion(window.localStorage, versionId, versionNameDraft));
      setRenamingVersionId(null); setSaveMessage(t('版本名称已更新。'));
    } catch { setSaveMessage(t('重命名失败，请检查名称或本机存储。')); }
  };
  useEffect(() => {
    let cancelled = false;
    let entries: SavedVersion[] = [];
    let message = '';
    try { entries = readVersions(window.localStorage); } catch { message = '版本列表读取失败，原存档未更改。'; }
    queueMicrotask(() => { if (!cancelled) { setVersions(entries); setSavedAt(entries[0]?.savedAt ?? null); if (message) setSaveMessage(t(message)); } });
    return () => { cancelled = true; };
  }, [t]);
  const importQuoteTable = () => {
    const data = quoteImportPreview.data;
    if (!data) return;
    const importedBanks = data.banks.map(name => banks.find(bank => bank.name === name) ?? { id: id('import-bank'), templateId: null, name, limitPct: 10 });
    const byName = new Map(importedBanks.map(bank => [bank.name, bank.id]));
    setBanks(old => [...old, ...importedBanks.filter(bank => !old.some(existing => existing.id === bank.id))]);
    setQuotes(data.quotes.map(quote => ({ id: id('import-quote'), bankId: byName.get(quote.bank)!, name: `${quote.bank} ${quote.term}`, wamDays: null, walDays: quote.days, rate: quote.rate, cap: null })));
    setQuoteImportBankIds(importedBanks.map(bank => bank.id));
    setQuoteView('matrix');
    setQuoteImportOpen(false);
    setQuoteImportText('');
    setDirty(true);
    clearTargetOutcome();
  };
  const updateMatrixRate = (bank: Bank, column: QuoteColumn, quoteId: string | undefined, rate: number | null) => {
    setQuotes(old => quoteId
      ? updateExistingMatrixRate(old, quoteId, rate)
      : rate === null ? old : [...old, { id: id('quote'), bankId: bank.id,
        name: `${bank.name} ${column.label}`, wamDays: column.wam === column.wal ? null : column.wam,
        walDays: column.wal, rate, cap: null }]);
    setDirty(true);
    clearTargetOutcome();
  };
  const addBankFromLibrary = (templateId: string) => {
    const template = availableBankTemplates.find(
      (bank) => bank.id === templateId,
    );
    if (!template) return;
    const bankId = id('today-bank');
    setQuoteImportBankIds(old => old ? [...old, bankId] : null);
    setBanks((old) => [
      ...old,
      {
        id: bankId,
        templateId: template.id,
        name: template.name,
        limitPct: template.defaultLimitPct,
      },
    ]);
    setDirty(true);
    clearTargetOutcome();
  };
  const resetBankForm = () => {
    setEditingBankId(null);
    setNewBankName('');
    setNewBankLimitPct(10);
  };
  const saveInstitution = (institution: BankTemplate) => {
    setBankLibrary(old => old.some(bank => bank.id === institution.id) ? old.map(bank => bank.id === institution.id ? institution : bank) : [...old, institution]);
  };
  const saveGroup = (group: InstitutionGroup) => {
    const previous = groups.find(g => g.id === group.id);
    if (previous && previous.name !== group.name) {
      setBankLibrary(old => renameGroupMembers(old, previous.name, group.name));
      setBanks(old => old.map(bank => concentrationKey(bank.groupName ?? '') === concentrationKey(previous.name) ? { ...bank, groupName: group.name } : bank));
    }
    setGroups(old => previous ? old.map(g => g.id === group.id ? group : g) : [...old, group]);
  };
  const deleteLibraryBank = (templateId: string) => {
    setBankLibrary(old => old.filter(bank => bank.id !== templateId));
    // Existing allocations keep their institution and limits when a library entry is removed.
    setBanks(old => old.map(bank => bank.templateId === templateId ? { ...bank, templateId: null } : bank));
    if (editingBankId === templateId) resetBankForm();
    setBankLibraryMessage(t('已从机构库删除；当前持仓、报价和测算机构保持不变。'));
  };
  const calculate = () => {
    setResult(calculatePlanCached(portfolio, modelBanks, quotes, holdings));
    setDirty(false);
    clearTargetOutcome();
  };
  const changeTradeMode = (tradeMode: TradeMode) => {
    const nextPortfolio = { ...portfolio, tradeMode };
    setPortfolio(nextPortfolio);
    setResult(
      calculatePlanCached(nextPortfolio, modelBanks, quotes, holdings),
    );
    setDirty(false);
    setTargetYtm(null);
    clearTargetOutcome();
  };
  const reset = () => {
    setQuoteImportBankIds(null);
    setRateScenario(emptyRateScenario());
    manualMetrics.current = null;
    const empty: Portfolio = { tradeMode: 'subscription', inputMode: portfolioInput.inputMode,
      aum: 0, ytm: 0, wam: 0, wal: 0, transactionAmount: 0, maxWam: null, maxWal: null,
      redemptionStressPct: 0, redemptionStressAmount: null, cashBufferAmount: 0 };
    setPortfolio(empty);
    setBanks([]);
    setHoldings([]);
    setQuotes([]);
    setResult(calculatePlan(empty, [], [], []));
    setDirty(true);
    setTargetYtm(null);
    clearTargetOutcome();
    setFrontiers({ wam: [], wal: [] });
    resetBankForm();
    setBankLibraryMessage('');
    setClearOpen(false);
  };
  const switchInputMode = (mode: InputMode) => {
    if (mode === (portfolioInput.inputMode ?? 'holdings')) return;
    setPortfolio(old => switchPortfolioMode(old, mode, holdings));
    setDirty(true);
    clearTargetOutcome();
  };
  const summaryFields = <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {SUMMARY_FIELDS.filter(key => !simpleMode || key !== 'cashBufferAmount').map(key => <NumberField key={key}
      readOnly={!canEditSummary(portfolioInput.inputMode, key)}
      label={t({ aum: '当前 AUM', ytm: '当前加权 YTM', wam: '当前 WAM', wal: '当前 WAL', cashBufferAmount: '现金缓冲金额' }[key])}
      value={portfolio[key] ?? 0} suffix={key === 'aum' || key === 'cashBufferAmount' ? t(amountUnit) : key === 'ytm' ? '%' : t('天')}
      error={key === 'aum' ? aumInputError : key === 'wam' ? currentWamInputError : key === 'wal' ? currentWalInputError : undefined}
      onChange={value => updatePortfolio(key, value ?? Number.NaN)} />)}
    {!simpleMode && <NumberField readOnly label={t('现金缓冲比例')} value={cashBufferPercentage(portfolio)} suffix="%" min={0} max={100}
      onChange={value => updatePortfolio('cashBufferPct', value ?? NaN)} />}
  </div>;
  const selectFrontierDay = (mode: FrontierMode, day: number) => {
    if (isRedemption || holdingErrors.length) return;
    const nextPortfolio = {
      ...portfolio,
      ...(mode === 'wam' ? { maxWam: day } : { maxWal: day }),
    };
    setPortfolio(nextPortfolio);
    setResult(optimiseSubscriptionCached(nextPortfolio, modelBanks, quotes));
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
      <header className="workspace-header border-b border-border bg-card text-foreground">
        <div className="mx-auto max-w-[1540px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <fieldset
              aria-label={t('界面语言')}
              className="inline-flex rounded-lg border border-border bg-white/50 p-0.5 dark:border-white/15 dark:bg-white/5"
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
                  className={`min-w-9 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    locale === option.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {theme === 'dark' ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
              <span>{theme === 'dark' ? t('浅色') : t('深色')}</span>
            </button>
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-white/50 px-2.5 py-1 text-xs text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
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
                      {(['元', '万元', '百万元', '亿元', 'Billion'] as const).map(
                        (unit) => (
                          <NativeSelectOption value={unit} key={unit}>
                            {t(unit)}
                          </NativeSelectOption>
                        ),
                      )}
                    </NativeSelect>
                  </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-sm border border-border bg-primary text-primary-foreground">
                <Calculator className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight">
                    {t('MMF 配置台')}
                  </h1>
                  <Badge className="border border-border bg-white/50 text-primary dark:border-white/10 dark:bg-white/10 dark:text-primary">
                    {t('本地草案')}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                  {t(
                    workspaceView === 'rates' ? t('根据预测利率比较锁定与等待策略') : workspaceView === 'versions' ? t('保存多个工作版本，按时间查看和恢复') : workspaceView === 'institutions' ? t('集中管理常用机构，供持仓与报价选择') : workspaceView === 'holdings'
                      ? t('集中维护持仓、机构归属与集中度上限')
                      : isRedemption
                        ? t('测算同比例赎回后的组合与机构敞口')
                        : t('在期限与机构集中度约束内，寻找最高收益配置'),
                  )}
                </p>
              </div>
            </div>

          </div>
        </div>
      </header>

      <nav
        aria-label={t('配置台工作区')}
        className="workspace-nav border-b border-border bg-card"
      >
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="inline-flex flex-wrap rounded-sm bg-muted/50 p-1">
            <Button variant="ghost" size="sm" aria-pressed={workspaceView === 'institutions'}
              className={workspaceView === 'institutions' ? 'bg-card text-foreground shadow-sm hover:bg-card' : 'text-muted-foreground hover:text-foreground'}
              onClick={() => setWorkspaceView('institutions')}>
              <Landmark />{t('机构管理')}
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
              <Wallet />
              {t('当前持仓')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={workspaceView === 'quotes'}
              className={
                workspaceView === 'quotes'
                  ? 'bg-card text-foreground shadow-sm hover:bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              }
              onClick={() => setWorkspaceView('quotes')}
            >
              <TrendingUp />
              {t('今日可投')}
            </Button>
            <TermStructureEntry active={workspaceView === 'rates'} onClick={() => setWorkspaceView('rates')} />
            <Button variant="ghost" size="sm" aria-pressed={workspaceView === 'planner'}
              className={workspaceView === 'planner' ? 'bg-card text-foreground shadow-sm hover:bg-card' : 'text-muted-foreground hover:text-foreground'}
              onClick={() => setWorkspaceView('planner')}>
              <Calculator />{t('配置测算')}
            </Button>
            <MathPrinciples portfolio={portfolio} banks={modelBanks} quotes={quotes} holdings={holdings} amountUnit={amountUnit} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveWorkspace}>{t('保存')}</Button>
            <Button variant={workspaceView === 'versions' ? 'default' : 'outline'} size="sm" aria-pressed={workspaceView === 'versions'} onClick={() => setWorkspaceView('versions')}>{t('版本管理')}</Button>
            <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}><Trash2 />{t('清空所有')}</Button>
          </div>
        </div>
      </nav>
      <div className="mx-auto flex max-w-[1540px] flex-wrap gap-3 px-5 py-2 text-sm text-muted-foreground">
        <span>{savedAt ? `${t('上次保存')}：${new Date(savedAt).toLocaleString(locale)}` : t('尚未保存')} · {t('本机存档 · 每次保存新增版本')}</span>
        <output>{saveMessage}</output>
      </div>
      <AlertDialog open={Boolean(restoreOpen)} onOpenChange={open => { if (!open) setRestoreOpen(false); }}>
        <AlertDialogContent initialFocus={cancelFocus}>
          <AlertDialogHeader><AlertDialogTitle>{t(restoreOpen === 'delete' ? t('删除所选版本？') : t('恢复所选版本？'))}</AlertDialogTitle><AlertDialogDescription>{versions.find(version => version.id === restoreVersionId)?.name} · {t(restoreOpen === 'delete' ? t('此版本将永久删除，无法撤销。当前工作内容和其他版本不受影响。') : t('将用此版本替换当前全部内容，未保存的修改会丢失。'))}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel ref={cancelFocus}>{t('取消')}</AlertDialogCancel><AlertDialogAction variant={restoreOpen === 'delete' ? 'destructive' : 'default'} onClick={restoreOpen === 'delete' ? deleteSelectedVersion : restoreWorkspace}>{t(restoreOpen === 'delete' ? t('确认删除') : t('确认恢复'))}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent initialFocus={cancelFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('确认清空所有？')}</AlertDialogTitle>
            <AlertDialogDescription>{t('将清空当前持仓、机构、报价、组合参数和测算结果，无法撤销。本机保存的机构库和工作存档将保留。')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelFocus}>{t('取消')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={reset}>{t('确认清空')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto max-w-[1540px] px-4 pt-5 sm:px-6 lg:px-8">
        <fieldset className="flex flex-wrap items-center gap-2" aria-label={t("输入模式")}>
          <legend className="mb-2 text-sm font-medium">{t("输入模式")}</legend>
          {(Object.keys(MODE_LABELS) as InputMode[]).map(mode => <Button key={mode} size="sm" variant={(portfolioInput.inputMode ?? 'holdings') === mode ? 'default' : 'outline'} aria-pressed={(portfolioInput.inputMode ?? 'holdings') === mode} onClick={() => switchInputMode(mode)}>{t(MODE_LABELS[mode])}</Button>)}
        </fieldset>
        <p className="mt-2 text-sm text-primary">{t(MODE_DESCRIPTIONS[portfolioInput.inputMode ?? 'holdings'])}</p>
      </div>
      <div
        className={`mx-auto max-w-[1540px] gap-4 px-4 py-4 sm:px-6 lg:px-8 ${
          workspaceView === 'planner'
            ? 'grid xl:grid-cols-[minmax(0,1.15fr)_minmax(560px,0.85fr)]'
            : 'block'
        }`}
      >
        <div className="space-y-4">
          {workspaceView === 'planner' && !isRedemption && !simpleMode && <section className={`${card} overflow-hidden`}>
            <div className="border-b border-border/60 bg-muted/40 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">CASH BUFFER · {t('赎回压力')}</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {t('现金压力测算')}
                  </h2>
                </div>
                <span
                  className={`rounded-sm px-3 py-1 text-sm font-medium ${stress.error ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
                >
                  {t(
                    stress.error
                      ? t('无法计算')
                      : stress.remainingCash <= EPSILON
                        ? t('现金恰好用尽')
                        : t('现金可覆盖'),
                  )}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  '压力基数：当前 AUM；仅使用现金，机构敞口保持不变。',
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
                  '金额／比例联动，以最后输入项为准。',
                )}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric
                  label={t('现金缓冲金额')}
                  value={`${number(stress.cash)} ${t(amountUnit)}`}
                  detail={`${percent(cashBufferPercentage(portfolio))} · ${t(simpleMode ? '手动输入，参考目标 5%' : '来自现金持仓，参考目标 5%')}`}
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
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                >
                  {t(stress.error)}
                </div>
              ) : simpleMode ? <p className="text-sm text-muted-foreground">{t("现金缓冲可覆盖本次压力赎回。简易模式不检查机构及集团集中度。")}</p> : (
                <div className="overflow-x-auto rounded-md border border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('机构')}</TableHead>
                        <TableHead className="text-right">
                          {t('原金额上限')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('压力后上限')}［4］
                        </TableHead>
                        <TableHead className="text-right">
                          {t('最多新增')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(simpleMode ? [] : modelBanks).map((bank) => {
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
              <ConstraintNotes items={['stress']} />
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
          </section>}

          {workspaceView === 'planner' ? (
            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div>
                  <p className="eyebrow">{t('01 · 组合参数')}</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {t('当前组合与目标')}{simpleMode && <Badge variant="secondary" className="ml-2">{t('简易模式')}</Badge>}
                  </h2>
                </div>
                <div className="flex items-center gap-2">

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
                        ? t('第一版按当前组合所有资产同比例赎回')
                        : t('将新增资金配置到今日可投产品'),
                    )}
                  </p>
                </div>
                <fieldset className="grid w-full grid-cols-2 rounded-md bg-muted p-1 sm:w-auto">
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
                      disabled={mode === 'redemption'}
                      aria-pressed={portfolio.tradeMode === mode}
                      onClick={() => changeTradeMode(mode)}
                      className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        portfolio.tradeMode === mode
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t(mode === 'redemption' ? t('净赎回（暂不可用）') : label)}
                    </button>
                  ))}
                </fieldset>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                <NumberField
                  label={t('当前 AUM（绝对金额）')}
                  readOnly
                  value={portfolio.aum}
                  suffix={amountUnit}
                  min={0}
                  error={aumInputError}
                  onChange={() => {}}
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
                  label={t('当前加权 YTM')}
                  readOnly
                  value={portfolio.ytm}
                  suffix="%"
                  onChange={() => {}}
                />
                <NumberField
                  label={t('当前 WAM')}
                  readOnly
                  value={portfolio.wam}
                  suffix={t('天')}
                  min={0}
                  error={currentWamInputError}
                  warning={currentWamWarning}
                  warningTone="red"
                  onChange={() => {}}
                />
                <NumberField
                  label={t('当前 WAL')}
                  readOnly
                  value={portfolio.wal}
                  suffix={t('天')}
                  min={0}
                  error={currentWalInputError}
                  warning={currentWalWarning}
                  warningTone="red"
                  onChange={() => {}}
                />
                <NumberField
                  label={`${t(isRedemption ? 'WAM 上限（合规检验）' : 'WAM 上限')}［1］`}
                  value={portfolio.maxWam}
                  suffix={t('天')}
                  optional
                  min={0}
                  max={SFC_MAX_WAM_DAYS}
                  error={maxWamError}
                  onChange={(value) => updatePortfolio('maxWam', value)}
                />
                <NumberField
                  label={`${t(isRedemption ? 'WAL 上限（合规检验）' : 'WAL 上限')}［1］`}
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
                      '同比例赎回：AUM 减少，收益、期限及集中度比例不变。',
                    )}
                  </>
                ) : (
                  <>
                    {t(
                      '当前组合数据来自持仓页。',
                    )}
                  </>
                )}
              </p>
              <ConstraintNotes items={['term', 'input']} />
              <Button variant="outline" className="mx-5 mb-3" onClick={() => setWorkspaceView('holdings')}>
                {t('编辑持仓')}
              </Button>
            </section>
          ) : workspaceView === 'holdings' ? (
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
                <div className="space-y-4 p-5">
                  {summaryFields}
                  {!simpleMode && <p className="text-sm text-muted-foreground">{t('现金缓冲按现金持仓汇总。')}</p>}
                  {!simpleMode && <p className="text-sm text-muted-foreground">{t("持仓合计：")}{number(holdingTotal)} {t(amountUnit)}。{holdingTotalError ? t(holdingTotalError) : t('AUM 已对账。')}</p>}
                </div>
              </section>
              {!simpleMode && <section className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="eyebrow">{t('01 · 当前持仓')}</p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {t('当前持仓明细')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        '机构敞口从当前持仓自动汇总。',
                      )}
                    </p>
                  </div>
                  {aggregateMode && <ConstraintNotes items={['term']} />}
                </div>
                {metrics.errors.length > 0 ? (
                  <p role="alert" className="px-5 pb-3 text-sm text-destructive">
                    {t(aggregateMode ? t('请补齐持仓收益率') : t('请补齐持仓收益率与有效期限'))}：{metrics.errors.join('、')}
                  </p>
                ) : null}
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

                <div className="flex justify-end gap-2 border-b border-border/60 px-5 py-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => setHoldingImportOpen(open => !open)}>{t(holdingImportOpen ? '收起导入' : '粘贴持仓表')}</Button>
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
                {holdingImportOpen && <HoldingImport amountUnit={amountUnit} existingCount={holdings.length} onImport={(rows, replace) => {
                  const imported = rows.map(row => ({ ...row, id: id('import-holding'), bankId: UNASSIGNED_BANK_ID, wamDays: null, walDays: null }));
                  setHoldings(old => replace ? imported : [...old, ...imported]);
                  setHoldingImportOpen(false);
                  setDirty(true);
                  clearTargetOutcome();
                }} />}
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
                      <TableHead className="min-w-32">{t('持仓 YTM')} %</TableHead>
                      {!aggregateMode && <><TableHead className="min-w-32">WAM / {t('天')}</TableHead>
                      <TableHead className="min-w-32">WAL / {t('天')}</TableHead></>}
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
                          {(['ytm', 'wamDays', 'walDays'] as const).filter(field => !aggregateMode || field === 'ytm').map(field => (
                            <TableCell key={field} className="min-w-32">
                              <EditableNumberInput
                                aria-label={`${holding.name} ${field === 'ytm' ? 'YTM' : field === 'wamDays' ? 'WAM' : 'WAL'}`}
                                value={holding.isCash && field !== 'ytm' ? 0 : holding[field] ?? null}
                                readOnly={holding.isCash && field !== 'ytm'}
                                placeholder={field === 'wamDays' ? t('同 WAL') : t('必填')}
                                aria-invalid={holding.amount > 0 && metrics.errors.includes(holding.name) || undefined}
                                onValueChange={value => updateHolding(holding.id, { [field]: value })}
                              />
                            </TableCell>
                          ))}
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
                          colSpan={(isRedemption ? 9 : 7) - (aggregateMode ? 2 : 0)}
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
                    '“无机构归属”不计集中度，仅用于经确认的排除项。',
                  )}
                  {isRedemption
                    ? t(' 当前显示的是同比例情景，不代表赎回优先级。')
                    : ''}
                </p>
              </section>}

              <section className={card}>
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{t('02 · 机构集中度')}</p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {t(simpleMode ? t('报价机构') : t('机构集中度汇总'))}
                    </h2>
                  </div>
                  <Badge variant="outline">
                    {t('当前机构')}
                    {banks.length}
                    {t('家')}
                  </Badge>
                </div>

                <div className="border-b border-border/60 bg-muted/40 p-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t('选择已有机构')}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t('选择后可用于持仓归属和今日报价')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setWorkspaceView('institutions')}>{t('管理机构')}<ArrowRight /></Button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <NativeSelect
                        aria-label={t('选择已有机构')}
                        value=""
                        onChange={(event) =>
                          addBankFromLibrary(event.target.value)
                        }
                        className="min-w-0 flex-1"
                      >
                        <NativeSelectOption value="">
                          {t(
                            !bankLibrary.length ? t('请先到机构管理新增机构') : availableBankTemplates.length
                              ? t('选择后直接加入')
                              : t('已保存机构均已加入'),
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
                    </div>
                  </div>

                </div>

                {simpleMode ? <div className="space-y-3 p-5">
                  <p className="text-sm text-muted-foreground">{t('简易模式不计算机构集中度；以下机构仅用于报价归属。')}</p>
                  <div className="flex flex-wrap gap-2">{banks.map(bank => <Badge key={bank.id} variant="outline">{bank.name}</Badge>)}</div>
                </div> : <>
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
                        {t(isRedemption ? t('赎回后占比（不变）') : t('当前占比'))}
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t(isRedemption ? t('与当前占比相同') : t('占当前 AUM'))}
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        {t('适用集中度上限')}［2］
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t('合规确认 · 占交易后 NAV/%')}
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        {t(isRedemption ? t('赎回后持仓') : t('压力后额度上限'))}［4］
                        <span className="block text-[11px] font-normal text-muted-foreground/75">
                          {t('绝对金额/')}
                          {t(amountUnit)}
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        {t(isRedemption ? t('预计同比例赎回') : t('本次最多可新增'))}
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
                      const linkedQuoteCount =
                        bankQuoteCountById.get(bank.id) ?? 0;
                      const hasQuotes = linkedQuoteCount > 0;
                      const linkedHoldingCount =
                        bankHoldingCountById.get(bank.id) ?? 0;
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
                                readOnly
                                onValueChange={() => {}}
                                title={t('在机构管理中修改上限')}
                                aria-invalid={
                                  concentrationError ? true : undefined
                                }
                                className={`text-right bg-muted text-muted-foreground cursor-not-allowed ${
                                  concentrationError
                                    ? 'border-red-300 bg-red-50 text-red-950'
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
                                <span title={t(concentrationNotice)} className="text-xs leading-4 text-amber-700 dark:text-amber-400">
                                  {t('超过一般上限需确认')}
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
                                  : t('从当前测算移除；已保存的机构仍可再次选择')
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
                            '请先新增机构或选择已有机构。',
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
                          '剩余持仓 = 当前持仓 ×（1 − 赎回比例）。',
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
                          '被持仓或报价引用的机构不能直接移除；持仓请先在上方改绑，关联报价请到今日可投界面删除。',
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
                          onClick={() => setWorkspaceView('quotes')}
                        >
                          {t('前往今日可投查看报价')}
                          <ArrowRight />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <ConstraintNotes items={['entity', 'input']} />
                </div>
                </>}
              </section>
            </>
          ) : null}

          {workspaceView === 'rates' && <RateScenarioPanel scenario={rateScenario} onChange={setRateScenario} portfolio={portfolio} banks={modelBanks} quotes={quotes} amountUnit={amountUnit} inputErrors={holdingErrors} />}
          {workspaceView === 'versions' && <section className={card}>
            <div className="section-head">
              <div><p className="eyebrow">{t('工作版本')}</p><h2 className="mt-1 text-lg font-semibold">{t('版本管理')}</h2></div>
              <Button onClick={saveWorkspace}>{t('保存当前为新版本')}</Button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">{t('按模式归档，可重命名。清空工作区不删除存档。')}</p>
              {!versions.length && <p className="py-6 text-center text-muted-foreground">{t('还没有保存的版本。')}</p>}
              {groupVersionsByMode(versions).map(section => <section key={section.mode} className="space-y-3 rounded-md border border-border p-4">
                <h3 className="font-semibold">{t(section.mode === 'simple' ? t('简易模式') : section.mode === 'aggregate' ? t('汇总期限模式') : t('持仓模式'))} <span className="text-muted-foreground">({section.entries.length})</span></h3>
                {!section.entries.length && <p className="text-sm text-muted-foreground">{t("此模式暂无保存版本。")}</p>}
                {section.entries.map(version => {
                const saved = decodeWorkspace(version.data);
                return <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4">
                  <div className="min-w-0">
                    {renamingVersionId === version.id ? <div className="flex gap-2"><Input aria-label={t('版本名称')} value={versionNameDraft} onChange={event => setVersionNameDraft(event.target.value)} /><Button size="sm" disabled={!versionNameDraft.trim()} onClick={() => saveVersionName(version.id)}>{t('保存名称')}</Button><Button size="sm" variant="ghost" onClick={() => setRenamingVersionId(null)}>{t('取消')}</Button></div> : <h3 className="font-semibold">{version.name}</h3>}
                    <p className="mt-1 text-sm text-muted-foreground">{new Date(version.savedAt).toLocaleString()} · {t(saved.portfolioInput.inputMode === 'simple' ? t('简易模式') : saved.portfolioInput.inputMode === 'aggregate' ? t('汇总期限模式') : t('持仓模式'))} · {saved.quotes.length} {t('条报价')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setRenamingVersionId(version.id); setVersionNameDraft(version.name); }}>{t('重命名')}</Button><Button variant="outline" size="sm" onClick={() => { setRestoreVersionId(version.id); setRestoreOpen('restore'); }}>{t('恢复此版本')}</Button><Button variant="ghost" size="sm" className="text-destructive" aria-label={`${t('删除版本')} ${version.name}`} onClick={() => { setRestoreVersionId(version.id); setRestoreOpen('delete'); }}><Trash2 />{t('删除')}</Button></div>
                </div>;
              })}</section>)}
            </div>
          </section>}

          {workspaceView === 'institutions' && <section className={card}>
            <div className="section-head"><div><p className="eyebrow">{t('04 · 机构管理')}</p><h2 className="mt-1 text-lg font-semibold">{t("机构与集团")}</h2></div><Badge variant="secondary">{t('仅保存在本机')}</Badge></div>
            <div className="p-5">
              <InstitutionManager institutions={bankLibrary} groups={groups}
                onSaveInstitution={saveInstitution} onDeleteInstitution={deleteLibraryBank}
                onSaveGroup={saveGroup} onDeleteGroup={groupId => setGroups(old => old.filter(g => g.id !== groupId))}
                groupInUse={name => [...bankLibrary, ...banks].some(bank => concentrationKey(bank.groupName ?? '') === concentrationKey(name))} />
            </div>
          </section>}

          {workspaceView === 'holdings' && !simpleMode && <section className="rounded-md border border-border bg-card p-5 space-y-3">
            <h2 className="text-lg font-semibold">{t("集团集中度汇总［3］")}</h2>
            <p className="text-sm text-muted-foreground">{t("集团内机构共享额度。")}</p>
            {concentrationBuckets(modelBanks).filter(bucket => bucket.kind === 'group').map(group => <div key={group.name} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm"><span>{group.name}</span><span>{t("当前敞口")}{number(group.currentExposure)} {amountUnit}{t("· 上限")}{percent(group.limitPct)}{t("· 可新增")}{number(Math.max(0, (isRedemption ? postAum : stress.stressedAum) * (group.limitPct / 100) - postTradeExistingExposure(portfolio, group.currentExposure)))} {t(amountUnit)}</span></div>)}
            {!modelBanks.some(bank => bank.groupName) && <p className="text-sm text-muted-foreground">{t("请在机构管理中填写集团归属。")}</p>}
            <ConstraintNotes items={['group']} />
          </section>}

          {workspaceView === 'quotes' ? (
            <>
              <section className={card}>
                <div className="section-head">
                  <div>
                    <p className="eyebrow">
                      02 · {t(isRedemption ? t('赎回规则') : t('市场报价'))}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {t(
                        isRedemption
                          ? t('按现有组合同比例赎回')
                          : t('今日可投产品与报价'),
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
                        setQuoteView('details');
                        setQuotes((old) => [
                          ...old,
                          {
                            id: id('quote'),
                            name: t('新产品'),
                            bankId: banks[0].id,
                            wamDays: null,
                            walDays: 30,
                            rate: 3,
                            cap: null,
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
                    <div className="rounded-md border border-primary/35 bg-muted/40 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        {t('当前版本不选择具体赎回产品')}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground/75">
                        {t(
                          '按赎回比例缩减全部持仓，收益、期限及集中度比例不变。',
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
                    <div className="space-y-3 border-b border-border/60 p-5">
                      <Button variant="outline" size="sm" onClick={() => setQuoteImportOpen(open => !open)}>{t('导入报价表 / 图片')}</Button>
                      {quoteImportOpen && <div className="grid gap-3 rounded-md border border-border p-4">
                        <QuoteImageImport onText={setQuoteImportText} t={t} />
                        <label className="grid gap-2 text-sm">{t('报价表内容')}<textarea className="min-h-40 rounded-lg border border-border bg-card p-3 font-mono text-sm" value={quoteImportText} onChange={event => setQuoteImportText(event.target.value)} /></label>
                        <p className="text-sm text-muted-foreground">{t('导入将替换今日报价，矩阵显示本次导入机构；保留当前组合参数、持仓和机构库。空白不生成报价，额度为无限制。')}</p>
                        {quoteImportPreview.data ? <p>{quoteImportPreview.data.banks.length} {t('家银行')} · {quoteImportPreview.data.quotes.length} {t('条报价')}</p> : quoteImportText && <p className="text-sm text-destructive">{quoteImportPreview.error}</p>}
                        <p className="text-sm text-muted-foreground">{t('支持 Excel 粘贴或 CSV 文本；首列为 Bank、银行或机构，其余列为期限（如 CASA、O/N、1W、1M）。利率 3.5 与 3.5% 含义相同。')}</p>
                        {quoteImportPreview.data && <div className="max-h-72 overflow-auto"><Table><TableHeader><TableRow><TableHead>{t('机构')}</TableHead><TableHead>{t('期限')}</TableHead><TableHead>{t('利率')} %</TableHead></TableRow></TableHeader><TableBody>{quoteImportPreview.data.quotes.map((quote, index) => <TableRow key={index}><TableCell>{quote.bank}</TableCell><TableCell>{quote.term}</TableCell><TableCell>{quote.rate}</TableCell></TableRow>)}</TableBody></Table></div>}
                        <Button disabled={!quoteImportPreview.data} onClick={importQuoteTable}>{t('导入报价')}</Button>
                      </div>}
                      <fieldset className="flex flex-wrap gap-2" aria-label={t('报价视图')}>
                        <Button size="sm" variant={quoteView === 'matrix' ? 'default' : 'outline'} aria-pressed={quoteView === 'matrix'} onClick={() => setQuoteView('matrix')}>{t('银行 × 期限')}</Button>
                        <Button size="sm" variant={quoteView === 'details' ? 'default' : 'outline'} aria-pressed={quoteView === 'details'} onClick={() => setQuoteView('details')}>{t('明细与额度')}</Button>
                      </fieldset>
                      <p className="text-sm text-muted-foreground">{t('利率单位 %；空白无报价，0 为零利率。额度在明细中设置。')}</p>
                    </div>
                    {quoteView === 'matrix' ? <>
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="sticky left-0 z-10 min-w-44 bg-card text-center">{t('机构')}</TableHead>
                          {matrixColumns.map(column => <TableHead key={column.key} className="min-w-28 text-center">
                            <span>{column.label}</span><span className="block text-xs font-normal text-muted-foreground">{column.wam === column.wal ? `${column.wal} ${t('天')}` : `WAM ${column.wam} / WAL ${column.wal}`}</span>
                          </TableHead>)}
                        </TableRow></TableHeader>
                        <TableBody>{banks.filter(bank => !quoteImportBankIds || quoteImportBankIds.includes(bank.id) || quotes.some(quote => quote.bankId === bank.id)).map(bank => <TableRow key={bank.id}>
                          <TableCell className="sticky left-0 z-10 bg-card font-medium">{bank.name}</TableCell>
                          {matrixColumns.map(column => {
                            const cellQuotes = quotes.filter(quote => quote.bankId === bank.id && quoteColumnKey(quote) === column.key);
                            return <TableCell key={column.key} className="align-top">
                              {(cellQuotes.length ? cellQuotes : [undefined]).map((quote, index) => <div key={index} className="mb-1 grid gap-1">
                                {cellQuotes.length > 1 && <span className="max-w-36 truncate text-xs text-muted-foreground" title={quote?.name}>{quote?.name}</span>}
                                <EditableNumberInput aria-label={`${bank.name} ${column.label} ${quote?.name ?? ''} ${t('利率/%')}`}
                                  value={quote?.rate ?? null} placeholder="—" className="text-right" aria-invalid={quote && !Number.isFinite(quote.rate) ? true : undefined}
                                  onValueChange={rate => updateMatrixRate(bank, column, quote?.id, rate)}
                                  onBlur={event => { if (quote && event.target.value.trim() === '') { setQuotes(old => old.filter(item => item.id !== quote.id)); setDirty(true); clearTargetOutcome(); } }} />
                                {quote?.cap != null && <span className="text-xs text-muted-foreground">{t('上限')} {number(quote.cap)} {t(amountUnit)}</span>}
                              </div>)}
                            </TableCell>;
                          })}
                        </TableRow>)}
                        </TableBody>
                      </Table>
                      <p className="border-t border-border/60 px-5 py-3 text-sm text-muted-foreground">{t('月份期限按表头天数测算（1M = 30天）；可在明细中调整实际 WAM/WAL。非标准期限自动追加列，同机构同期限的多条报价分别保留。')}</p>
                    </> : <>
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
                            {t('本次可投上限')}{t("［设置］")}<span className="block text-[11px] font-normal text-muted-foreground/75">
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
                                  placeholder={key === 'cap' ? t('无限制') : undefined}
                                  min={key === 'cap' ? 0 : undefined}
                                  step="0.01"
                                  onValueChange={(nextValue) =>
                                    updateQuote(quote.id, {
                                      [key]: key === 'cap' ? nextValue : nextValue ?? Number.NaN,
                                    })
                                  }
                                  aria-invalid={
                                    (key === 'cap' && value === null ? false : !Number.isFinite(value)) || undefined
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
                        '额度：空白不限，0 不可投。WAL 为最终到期天数；WAM 默认同 WAL，符合重定价计量条件的浮息工具可单填。',
                      )}
                    </p>
                    </>}
                  </>
                )}
                <ConstraintNotes items={['quote', 'term']} />
              </section>
              <Button variant="outline" onClick={() => setWorkspaceView('planner')}>
                {t('前往配置测算')}<ArrowRight />
              </Button>
            </>
          ) : null}

          {workspaceView === 'planner' ? (
            <>
              {hasRegulatoryLimitViolation ? (
                <Alert variant="destructive" aria-live="assertive">
                  <AlertTriangle />
                  <div>
                    <AlertTitle>
                      {t(
                        hasHoldingsWorkspaceViolation
                          ? t('当前持仓或机构集中度数据需修正，完成后才能继续计算。')
                          : t('存在超出监管硬上限或无效输入，请先修正上方提示。'),
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
                      ? t('按现有组合同比例扣减；不使用市场报价')
                      : t('连续金额优化；未配置资金按零期限、零收益现金处理'),
                  )}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                  {!isRedemption && <DeepReviewButton portfolio={portfolio} banks={modelBanks} quotes={quotes} result={result} dirty={dirty} />}
                  <Button
                    size="lg"
                    onClick={calculate}
                    disabled={hasRegulatoryLimitViolation}
                    className="w-full bg-primary px-5 text-primary-foreground hover:bg-primary/90 sm:w-auto"
                  >
                    {t(isRedemption ? t('测算赎回后组合') : t('计算最优配置'))}{' '}
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {workspaceView === 'planner' ? (
          <aside className="xl:self-start">
            <section className="overflow-hidden rounded-md border border-border bg-card shadow-none">
              <div className="flex items-start justify-between border-b border-border/60 px-5 py-4">
                <div>
                  <p className="eyebrow">{t('决策面板')}</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {t(isRedemption ? t('赎回后组合快照') : t('收益前沿与推荐配置'))}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      isRedemption
                        ? t('按现有组合同比例缩减；结果以最近一次测算为准')
                        : t('前沿随输入实时更新；配置结果以最近一次计算为准'),
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
                    {t('已建模约束通过')}
                  </Badge>
                ) : (
                  <Badge variant="destructive">{t('输入需调整')}</Badge>
                )}
              </div>

              {isRedemption ? (
                <div className="border-b border-border/60 p-5">
                  <div className="rounded-md border border-primary/35 bg-muted/40 p-4">
                    <p className="eyebrow">{t('赎回影响')}</p>
                    <h3 className="mt-1 text-sm font-semibold">
                      {t('同比例赎回不改变期限与收益指标')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-foreground/75">
                      {t(
                        '净赎回不适用收益前沿及目标反推。',
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-b border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                    <div>
                      <p className="eyebrow">{t('收益前沿')}</p>
                      <h3 className="mt-1 flex items-center gap-2 text-sm font-semibold">
                        <TrendingUp className="size-4 text-primary" />
                        {t('多一天期限，换来多少收益')}
                      </h3>
                    </div>
                    <div
                      className="inline-flex flex-wrap rounded-sm bg-muted/50 p-1"
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
                    ) : frontiers.source?.portfolio !== portfolio || frontiers.source?.banks !== modelBanks || frontiers.source?.quotes !== quotes ? (
                      <output className="flex min-h-80 items-center justify-center gap-2 p-5 text-sm text-muted-foreground" aria-live="polite" aria-busy="true">
                        <span className="size-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary motion-reduce:animate-none" aria-hidden="true" />
                        {t('计算中…')}
                      </output>
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
                  {t(isRedemption ? t('测算结果') : t('最优解'))}
                </p>
                <h3 className="mt-1 text-sm font-semibold">
                  {t(isRedemption ? t('同比例赎回结果') : t('推荐配置'))}
                </h3>
              </div>

              {hasRegulatoryLimitViolation ? (
                <div className="p-5">
                  <Alert variant="destructive" className="p-4">
                    <AlertTriangle />
                    <AlertTitle>
                      {t(
                        isRedemption
                          ? t('赎回测算已暂时隐藏。请先修正标红字段，再重新测算。')
                          : t('推荐配置已暂时隐藏。请先修正标红字段，再重新计算。'),
                      )}
                    </AlertTitle>
                  </Alert>
                </div>
              ) : dirty ? (
                <output className="block p-5 text-sm text-muted-foreground">{t('输入已修改，请重新计算以查看最新配置。')}</output>
              ) : result.ok ? (
                <div
                  aria-live="polite"
                  className={dirty ? 'opacity-55 transition-opacity' : ''}
                >
                  {result.tradeMode === 'redemption' ? (
                    <div className="px-5 pt-5">
                      <div className="flex items-center justify-between gap-4 rounded-md border border-primary/35 bg-muted/40 px-4 py-3">
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
                      detail={`${t(
                        `${result.tradeMode === 'redemption' ? '赎回' : '新增'} ${number(result.transactionAmount)} ${amountUnit}`,
                      )} · ${t('交易前 AUM')} ${number(portfolio.aum)} ${t(amountUnit)}`}
                    />
                    <Metric
                      label={t('交易后 YTM')}
                      value={percent(result.postYtm, 3)}
                      detail={`${
                        result.tradeMode === 'redemption'
                          ? t('同比例赎回，与当前组合一致')
                          : t(`新增资金 ${percent(result.allocationYield, 3)}`)
                      } · ${t('交易前 YTM')} ${percent(portfolio.ytm, 3)}`}
                      accent
                    />
                    <Metric
                      label={t('交易后 WAM')}
                      value={`${number(result.postWam)}${t('天')}`}
                      detail={`${
                        result.tradeMode === 'redemption'
                          ? t('同比例赎回，与当前组合一致')
                          : t(`计算所用上限 ${number(result.appliedMaxWam)} 天`)
                      } · ${t('交易前 WAM')} ${number(portfolio.wam)} ${t('天')}`}
                    />
                    <Metric
                      label={t('交易后 WAL')}
                      value={`${number(result.postWal)}${t('天')}`}
                      detail={`${
                        result.tradeMode === 'redemption'
                          ? t('同比例赎回，与当前组合一致')
                          : t(`计算所用上限 ${number(result.appliedMaxWal)} 天`)
                      } · ${t('交易前 WAL')} ${number(portfolio.wal)} ${t('天')}`}
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

                  {simpleMode ? <p className="border-t border-border/60 p-5 text-sm text-muted-foreground">{t('简易模式不校验现金压力与机构集中度。')}</p> : <div className="border-t border-border/60">
                    <h3 className="flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                      <Landmark className="size-4 text-primary" />{' '}
                      {t(
                        result.tradeMode === 'redemption'
                          ? t('机构同比例赎回明细')
                          : t('交易后机构占比'),
                      )}
                    </h3>
                    <div className="space-y-4 px-5 pb-5">
                      {(simpleMode ? [] : result.banks).map((bank) => {
                        const stressedPct = bank.stressedPct ?? bank.finalPct;
                        const currentUsed =
                          bank.limitPct > 0
                            ? Math.min(
                                100,
                                Math.max(
                                  0,
                                  (bank.finalPct / bank.limitPct) * 100,
                                ),
                              )
                            : 0;
                        const stressedUsed =
                          bank.limitPct > 0
                            ? Math.min(
                                100,
                                Math.max(
                                  currentUsed,
                                  (stressedPct / bank.limitPct) * 100,
                                ),
                              )
                            : currentUsed;
                        const pressureWidth = stressedUsed - currentUsed;
                        const upperLimitWidth = 100 - stressedUsed;
                        const atLimit = bank.remaining <= EPSILON;
                        return (
                          <div key={bank.id}>
                            <div className="mb-1.5 flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
                              <span className="font-medium text-foreground/85">
                                {bank.name}
                              </span>
                              <span className="tabular-nums">
                                {bank.stressedPct !== undefined
                                  ? t('压力')
                                  : t('当前')}{' '}
                                {percent(stressedPct)}{' '}
                                <span className="text-muted-foreground">
                                  / {t('上限')} {percent(bank.limitPct)}
                                </span>
                              </span>
                            </div>
                            <div
                              className="flex h-2 overflow-hidden rounded-full"
                              aria-label={`${t('当前')} ${percent(bank.finalPct)}，${t('压力')} ${percent(stressedPct)}，${t('上限')} ${percent(bank.limitPct)}`}
                            >
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${currentUsed}%` }}
                              />
                              <div
                                className="h-full bg-amber-500"
                                style={{ width: `${pressureWidth}%` }}
                              />
                              <div
                                className="h-full bg-slate-200 dark:bg-slate-700"
                                style={{ width: `${upperLimitWidth}%` }}
                              />
                            </div>
                            <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px] tabular-nums text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                                {t('当前')} {percent(bank.finalPct)}
                              </span>
                              <span className="flex items-center justify-center gap-1">
                                <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                                {t('压力')} {percent(stressedPct)}
                              </span>
                              <span className="flex items-center justify-end gap-1 text-right">
                                <span className="size-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                                {t('上限')} {percent(bank.limitPct)}
                              </span>
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
                  </div>}
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
            <ConstraintNotes items={['term', 'entity', 'group', 'quote']} />
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
