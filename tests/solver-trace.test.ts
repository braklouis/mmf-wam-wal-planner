import test from 'node:test';
import assert from 'node:assert/strict';
import { simplex, type SolverTrace } from '../lib/simplex.ts';
import { calculatePlan, initialPortfolio, initialBanks, initialQuotes, initialHoldings, aggregateInstitutionExposures } from '../lib/planner.ts';

void test('simplex trace records actual pivots without changing the solution', () => {
  const steps: Parameters<NonNullable<Parameters<typeof simplex>[3]>>[0][] = [];
  const expected = simplex([3, 2], [[1, 1], [1, 0]], [4, 2]);
  const actual = simplex([3, 2], [[1, 1], [1, 0]], [4, 2], step => steps.push(step));
  assert.deepEqual(actual, expected);
  assert.ok(steps.length > 0);
  assert.ok(Math.abs(steps.at(-1)!.objective - 10) < 1e-9);
});

void test('planner diagnostics preserve results and expose the actual feasible LP', () => {
  const trace: SolverTrace = { objective: [], matrix: [], limits: [], labels: [], steps: [] };
  const banks = aggregateInstitutionExposures(initialBanks, initialHoldings);
  const expected = calculatePlan(initialPortfolio, banks, initialQuotes, initialHoldings);
  const actual = calculatePlan(initialPortfolio, banks, initialQuotes, initialHoldings, trace);
  assert.deepEqual(actual, expected);
  assert.ok(actual.ok && actual.tradeMode === 'subscription');
  assert.ok(trace.matrix.length > 0);
  assert.equal(trace.labels.length, trace.matrix.length);
  if (!actual.ok || actual.tradeMode !== 'subscription') return;
  const shares = initialQuotes.map(q => (actual.allocations.find(a => a.id === q.id)?.amount ?? 0) / actual.postAum);
  trace.matrix.forEach((row, i) => assert.ok(row.reduce((sum, c, j) => sum + c * shares[j], 0) <= trace.limits[i] + 1e-8));
});
