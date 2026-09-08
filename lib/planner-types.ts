import type { ConcentrationMembership } from './concentration-groups.ts';
export type TradeMode = 'subscription' | 'redemption';
export type WorkspaceView = 'planner' | 'holdings' | 'quotes' | 'institutions' | 'versions' | 'rates';

export type Portfolio = {
  inputMode?: 'holdings' | 'simple' | 'aggregate';
  simpleInputs?: { aum: number; ytm: number; wam: number; wal: number; cashBufferAmount: number; cashBufferPct: number | null };
  summaryOverrides?: Partial<Pick<Portfolio, 'aum' | 'ytm' | 'wam' | 'wal' | 'cashBufferAmount'>>;
  aggregateWam?: number;
  aggregateWal?: number;
  tradeMode: TradeMode;
  aum: number;
  ytm: number;
  wam: number;
  wal: number;
  transactionAmount: number;
  maxWam: number | null;
  maxWal: number | null;
  redemptionStressPct?: number;
  redemptionStressAmount?: number | null;
  cashBufferAmount?: number;
  cashBufferPct?: number | null;
};

export type Bank = ConcentrationMembership & {
  id: string;
  templateId: string | null;
  name: string;
  limitPct: number;
};

export type ModelBank = Bank & {
  currentExposure: number;
};

export type BankTemplate = ConcentrationMembership & {
  id: string;
  name: string;
  defaultLimitPct: number;
};

export type AmountUnit = '元' | '万元' | '百万元' | '亿元' | 'Billion';

export type Quote = {
  id: string;
  name: string;
  bankId: string;
  wamDays: number | null;
  walDays: number;
  rate: number;
  cap: number | null;
};

export type Holding = {
  ytm?: number | null;
  wamDays?: number | null;
  walDays?: number | null;
  id: string;
  name: string;
  bankId: string | null;
  amount: number;
  isBalancing?: boolean;
  isCash?: boolean;
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
  stressedPct?: number;
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

