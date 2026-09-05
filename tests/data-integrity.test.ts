import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePlan, optimiseSubscription, aggregateInstitutionExposures, initialBanks, initialHoldings, initialPortfolio, initialQuotes, parseBankLibrary } from '../lib/planner.ts';

void test('duplicate IDs are rejected before they can merge exposures or allocations', () => {
  const banks = aggregateInstitutionExposures(initialBanks, initialHoldings);
  assert.equal(calculatePlan(initialPortfolio, banks, initialQuotes, [...initialHoldings, { ...initialHoldings[0], amount: 0 }]).ok, false);
  assert.equal(optimiseSubscription(initialPortfolio, [...banks, banks[0]], initialQuotes).ok, false);
  assert.equal(optimiseSubscription(initialPortfolio, banks, [...initialQuotes, initialQuotes[0]]).ok, false);
});

void test('saved institution names are normalized and corrupted entries ignored', () => {
  assert.equal(parseBankLibrary('{broken'), null);
  assert.deepEqual(parseBankLibrary('[]'), []);
  assert.deepEqual(parseBankLibrary(JSON.stringify([
    { id: 'a', name: ' Bank A ', defaultLimitPct: 25 },
    { id: 'b', name: 'bank a', defaultLimitPct: 10 },
    { id: 'c', name: 'Bank C', defaultLimitPct: 123 },
  ])), [{ id: 'a', name: 'Bank A', defaultLimitPct: 25 }]);
});
