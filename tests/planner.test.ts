import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateInstitutionExposures,
  calculatePlan,
  calculateProRataRedemption,
  initialBanks,
  initialHoldings,
  initialPortfolio,
  initialQuotes,
  optimiseSubscription,
  simplex,
  type Holding,
  type ModelBank,
  type Portfolio,
} from '../lib/planner.ts';

function closeTo(actual: number, expected: number, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should be within ${tolerance} of ${expected}`,
  );
}

void test('default subscription keeps the known optimum and every hard constraint', () => {
  const banks = aggregateInstitutionExposures(initialBanks, initialHoldings);
  const result = calculatePlan(
    initialPortfolio,
    banks,
    initialQuotes,
    initialHoldings,
  );

  assert.equal(result.ok, true);
  if (!result.ok || result.tradeMode !== 'subscription') return;

  closeTo(result.postYtm, 2.7550578034682083);
  closeTo(result.postWam, 31.447495183044314);
  closeTo(result.postWal, 60);
  assert.ok(result.postWam <= result.appliedMaxWam + 1e-10);
  assert.ok(result.postWal <= result.appliedMaxWal + 1e-10);
  assert.ok(
    result.allocations.reduce((sum, item) => sum + item.amount, 0) <=
      result.transactionAmount + 1e-10,
  );
  result.allocations.forEach((item) => {
    assert.ok(item.amount <= item.cap + 1e-10);
  });
  result.banks.forEach((bank) => {
    assert.ok(bank.finalPct <= bank.limitPct + 1e-10);
  });
});

void test('tiny-AUM subscription cannot cross an institution or WAM limit', () => {
  const result = optimiseSubscription(
    {
      tradeMode: 'subscription',
      aum: 0,
      ytm: 0,
      wam: 0,
      wal: 0,
      transactionAmount: 1e-8,
      maxWam: 60,
      maxWal: 120,
    },
    [
      {
        id: 'bank',
        templateId: null,
        name: '测试机构',
        limitPct: 25,
        currentExposure: 0,
      },
    ],
    [
      {
        id: 'quote',
        name: '测试报价',
        bankId: 'bank',
        wamDays: 120,
        walDays: 120,
        rate: 1,
        cap: 1e-8,
      },
    ],
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  closeTo(result.allocations[0]?.amount ?? 0, 2.5e-9, 1e-20);
  assert.ok(result.postWam <= 60);
  assert.ok(result.postWal <= 120);
  closeTo(result.banks[0].finalPct, 25, 1e-12);
  assert.ok(result.allocations[0].amount <= result.allocations[0].cap);
});

void test('simplex retains a positive objective far below the largest rate scale', () => {
  const result = simplex(
    [1e13, 1],
    [
      [1, 1],
      [1, 0],
    ],
    [2, 1],
  );

  assert.deepEqual(result, [1, 1]);
});

void test('near-total redemption reconciles against post-trade AUM, not original AUM', () => {
  const portfolio: Portfolio = {
    tradeMode: 'redemption',
    aum: 1e12,
    ytm: 2,
    wam: 20,
    wal: 30,
    transactionAmount: 1e12 - 1,
    maxWam: 60,
    maxWal: 120,
  };
  const holdings: Holding[] = [
    {
      id: 'institution',
      name: '机构持仓',
      bankId: 'bank',
      amount: 2.5e11,
    },
    {
      id: 'other',
      name: '其他资产',
      bankId: null,
      amount: 7.5e11 + 0.5,
    },
  ];
  const banks = aggregateInstitutionExposures(
    [
      {
        id: 'bank',
        templateId: null,
        name: '测试机构',
        limitPct: 25,
      },
    ],
    holdings,
  );

  const result = calculatePlan(portfolio, banks, [], holdings);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.messages.some((message) => message.includes('对账')));
});

void test('near-total redemption still accepts machine-precision rounding', () => {
  const aum = 1e-4;
  const portfolio: Portfolio = {
    tradeMode: 'redemption',
    aum,
    ytm: 2,
    wam: 20,
    wal: 30,
    transactionAmount: aum * (1 - 1e-10),
    maxWam: 60,
    maxWal: 120,
  };
  const weights = [0.23, 0.21, 0.2, 0.19, 0.17];
  const holdings: Holding[] = weights.map((weight, index) => ({
    id: `holding-${index}`,
    name: `持仓 ${index}`,
    bankId: `bank-${index}`,
    amount: aum * weight,
  }));
  holdings[4].amount +=
    aum - holdings.reduce((sum, holding) => sum + holding.amount, 0);
  const banks: ModelBank[] = holdings.map((holding, index) => ({
    id: `bank-${index}`,
    templateId: null,
    name: `机构 ${index}`,
    limitPct: 25,
    currentExposure: holding.amount,
  }));

  const result = calculateProRataRedemption(portfolio, banks, holdings);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.banks.every((bank) => bank.finalPct <= bank.limitPct));
});

void test('redemption rechecks institution concentration after holding aggregation', () => {
  const portfolio: Portfolio = {
    tradeMode: 'redemption',
    aum: 100,
    ytm: 2,
    wam: 20,
    wal: 30,
    transactionAmount: 99,
    maxWam: 60,
    maxWal: 120,
  };
  const banks: ModelBank[] = [
    {
      id: 'bank',
      templateId: null,
      name: '测试机构',
      limitPct: 25,
      currentExposure: 0,
    },
  ];
  const holdings: Holding[] = [
    {
      id: 'institution',
      name: '机构持仓',
      bankId: 'bank',
      amount: 100,
    },
  ];

  const result = calculateProRataRedemption(portfolio, banks, holdings);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.messages.some((message) => message.includes('集中度')));
});

void test('direct redemption rejects a holding assigned to an unknown institution', () => {
  const portfolio: Portfolio = {
    tradeMode: 'redemption',
    aum: 100,
    ytm: 2,
    wam: 20,
    wal: 30,
    transactionAmount: 10,
    maxWam: 60,
    maxWal: 120,
  };

  const result = calculateProRataRedemption(
    portfolio,
    [],
    [
      {
        id: 'unknown',
        name: '未知归属持仓',
        bankId: 'ghost',
        amount: 100,
      },
    ],
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.messages.some((message) => message.includes('归属机构')));
});

void test('redemption rejects a residual AUM below reliable floating-point precision', () => {
  const aum = 0.025;
  const result = calculateProRataRedemption(
    {
      tradeMode: 'redemption',
      aum,
      ytm: 2,
      wam: 20,
      wal: 30,
      transactionAmount: aum * (1 - 4 * Number.EPSILON),
      maxWam: 60,
      maxWal: 120,
    },
    [
      {
        id: 'bank',
        templateId: null,
        name: '测试机构',
        limitPct: 25,
        currentExposure: 0.005,
      },
    ],
    [
      {
        id: 'institution',
        name: '机构持仓',
        bankId: 'bank',
        amount: 0.005,
      },
      {
        id: 'cash',
        name: '现金',
        bankId: null,
        amount: 0.02,
      },
    ],
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.messages.some((message) => message.includes('数值精度')));
});
