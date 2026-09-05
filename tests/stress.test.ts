import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateInstitutionExposures,
  initialBanks,
  initialHoldings,
  initialPortfolio,
  initialQuotes,
  optimiseSubscription,
  redemptionStress,
  buildFrontier,
  solveTargetYtm,
} from '../lib/planner.ts';

const banks = aggregateInstitutionExposures(initialBanks, initialHoldings);
const base = { ...initialPortfolio, cashBufferAmount: 5 };

for (const pct of [0, 2, 5]) {
  void test(`${pct}% stress uses current AUM and constrains every institution`, () => {
    const portfolio = { ...base, redemptionStressPct: pct };
    const stress = redemptionStress(portfolio);
    assert.equal(stress.error, null);
    assert.equal(stress.redemption, pct);
    assert.equal(stress.stressedAum, 120 - pct);
    assert.equal(stress.remainingCash, 5 - pct);
    const outcome = optimiseSubscription(portfolio, banks, initialQuotes);
    assert.ok(outcome.ok);
    if (!outcome.ok) return;
    const bankA = outcome.banks.find((bank) => bank.id === 'today-bank-a')!;
    assert.ok(Math.abs(bankA.finalExposure - (120 - pct) * 0.25) < 1e-8);
    for (const bank of outcome.banks) {
      assert.ok(
        bank.finalExposure <= (stress.stressedAum * bank.limitPct) / 100 + 1e-8,
      );
      assert.ok(bank.stressedPct! <= bank.limitPct + 1e-8);
    }
    assert.equal(outcome.postAum, 120);
  });
}

void test('cash overflow blocks optimisation, frontiers and reverse search', () => {
  const portfolio = { ...base, redemptionStressPct: 5.01 };
  const result = optimiseSubscription(portfolio, banks, initialQuotes);
  assert.equal(result.ok, false);
  if (!result.ok)
    assert.ok(result.messages.some((message) => message.includes('T+0')));
  assert.deepEqual(buildFrontier('wam', portfolio, banks, initialQuotes), []);
  assert.equal(
    solveTargetYtm('wam', 2.6, portfolio, banks, initialQuotes).ok,
    false,
  );
});

void test('reverse search and frontier obey the same stressed constraints', () => {
  const portfolio = { ...base, redemptionStressPct: 5 };
  const result = solveTargetYtm('wam', 2.6, portfolio, banks, initialQuotes);
  assert.ok(result.ok);
  if (result.ok)
    result.result.banks.forEach((bank) =>
      assert.ok(bank.finalExposure <= (115 * bank.limitPct) / 100 + 1e-8),
    );
  const frontier = buildFrontier('wal', portfolio, banks, initialQuotes);
  assert.ok(frontier.length > 0);
  for (const point of frontier) {
    const result = optimiseSubscription(
      { ...portfolio, maxWal: point.day },
      banks,
      initialQuotes,
    );
    assert.ok(result.ok);
    if (result.ok)
      result.banks.forEach((bank) =>
        assert.ok(bank.finalExposure <= (115 * bank.limitPct) / 100 + 1e-8),
      );
  }
});

void test('stress rejects invalid percentages and invalid cash', () => {
  for (const pct of [-1, 100, Number.NaN, Infinity])
    assert.ok(redemptionStress({ ...base, redemptionStressPct: pct }).error);
  for (const cash of [-1, 101, Number.NaN, Infinity])
    assert.ok(redemptionStress({ ...base, cashBufferAmount: cash }).error);
  assert.ok(
    redemptionStress({ ...base, cashBufferAmount: 0, redemptionStressPct: 2 })
      .error,
  );
});

void test('non-cash holdings are excluded and existing breaches cannot be bought away', () => {
  assert.equal(
    initialHoldings
      .filter((h) => h.isCash)
      .reduce((sum, h) => sum + h.amount, 0),
    5,
  );
  const result = optimiseSubscription(
    { ...base, transactionAmount: 0, redemptionStressPct: 5 },
    banks,
    initialQuotes,
  );
  assert.equal(result.ok, false);
  if (!result.ok)
    assert.ok(
      result.messages.some((message) => message.includes('压力后金额上限')),
    );
});

void test('amount entry stays fixed as AUM changes; percentage entry scales', () => {
  const amount = { ...base, redemptionStressAmount: 2 };
  assert.equal(redemptionStress(amount).pct, 2);
  assert.equal(redemptionStress({ ...amount, aum: 200 }).pct, 1);
  assert.equal(redemptionStress({ ...amount, aum: 200 }).redemption, 2);
  assert.equal(
    redemptionStress({ ...base, aum: 200, redemptionStressPct: 2 }).redemption,
    4,
  );
  assert.deepEqual(
    optimiseSubscription(amount, banks, initialQuotes),
    optimiseSubscription(
      { ...base, redemptionStressPct: 2 },
      banks,
      initialQuotes,
    ),
  );
  assert.ok(redemptionStress({ ...base, redemptionStressAmount: 6 }).error);
  assert.ok(redemptionStress({ ...base, redemptionStressAmount: -1 }).error);
  assert.ok(
    redemptionStress({ ...base, redemptionStressAmount: Number.NaN }).error,
  );
  assert.ok(
    redemptionStress({ ...base, aum: 0, redemptionStressAmount: 2 }).error,
  );
  assert.equal(
    redemptionStress({ ...base, redemptionStressAmount: 5 }).error,
    null,
  );
});
