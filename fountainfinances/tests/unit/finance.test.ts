import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amortizedPayment, loanSummary, principalFromPayment, creditCardPayoff, compoundGrowth,
  cdMaturity, aprToApy, mortgagePayment, affordability, consolidationCompare, monthsToGoal,
  monthsToGoalWithInterest, autoLoan, homeEquity, budget, amortizationByYear, inflationAdjust, round2,
} from '../../src/lib/finance.ts';

const near = (a: number, b: number, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b}`);

test('30-year mortgage payment matches the standard amortization formula', () => {
  near(amortizedPayment(200_000, 6, 360), 1199.10);
  near(amortizedPayment(300_000, 7, 360), 1995.91);
});

test('zero-rate loans divide evenly', () => {
  assert.equal(amortizedPayment(12_000, 0, 12), 1000);
});

test('loan summary totals are consistent', () => {
  const s = loanSummary(10_000, 10, 36);
  near(s.payment, 322.67);
  near(s.totalPaid, s.payment * 36);
  near(s.totalInterest, s.totalPaid - 10_000);
});

test('principalFromPayment inverts amortizedPayment', () => {
  const p = amortizedPayment(250_000, 6.5, 360);
  near(principalFromPayment(p, 6.5, 360), 250_000, 0.01);
});

test('credit card payoff: payment below interest never pays off', () => {
  const r = creditCardPayoff(5_000, 24, 90);
  assert.equal(r.paysOff, false);
  near(r.minimumToProgress, 100);
});

test('credit card payoff converges and matches amortization', () => {
  const pay = amortizedPayment(5_000, 18, 24);
  const r = creditCardPayoff(5_000, 18, pay);
  assert.equal(r.months, 24);
  near(r.totalInterest, pay * 24 - 5_000, 0.05);
});

test('compound growth: annual compounding lump sum', () => {
  const g = compoundGrowth(10_000, 0, 5, 10, 'annually');
  near(g.futureValue, 16_288.95, 0.02);
  assert.equal(g.rows.length, 10);
});

test('compound growth with monthly contributions', () => {
  const g = compoundGrowth(0, 100, 0, 10);
  near(g.futureValue, 12_000);
  const g2 = compoundGrowth(1_000, 200, 6, 20);
  assert.ok(g2.futureValue > g2.totalContributions);
  near(g2.totalInterest, g2.futureValue - g2.totalContributions);
});

test('contribution increases raise contributions each year', () => {
  const g = compoundGrowth(0, 100, 0, 2, 'monthly', 10);
  near(g.totalContributions, 1200 + 1320);
});

test('CD maturity uses APY directly', () => {
  near(cdMaturity(10_000, 5, 12).value, 10_500);
  near(cdMaturity(10_000, 4, 24).interest, 816);
});

test('APR to APY conversion', () => {
  near(aprToApy(5, 12), 5.116, 0.001);
});

test('mortgage payment includes PMI only above 80% LTV', () => {
  const a = mortgagePayment({ homePrice: 400_000, downPayment: 80_000, ratePct: 6, years: 30, propertyTaxAnnual: 4_800, insuranceAnnual: 1_800, pmiRatePct: 0.5 });
  assert.equal(a.pmi, 0);
  near(a.tax, 400);
  near(a.insurance, 150);
  const b = mortgagePayment({ homePrice: 400_000, downPayment: 20_000, ratePct: 6, years: 30, propertyTaxAnnual: 0, insuranceAnnual: 0, pmiRatePct: 0.5 });
  near(b.pmi, 158.33);
});

test('affordability respects the lower of the two debt ratios', () => {
  const r = affordability({ annualIncome: 120_000, monthlyDebts: 1_000, downPayment: 60_000, ratePct: 6.5, years: 30, propertyTaxRatePct: 1.1, insuranceAnnual: 1_800, hoaMonthly: 0 });
  near(r.maxHousingPayment, 2_600); // 36% of 10k minus 1k debts < 28% of 10k
  assert.equal(r.limitedBy, 'total debt ratio');
  const housing = r.principalAndInterest + r.tax + 150;
  near(housing, 2_600, 0.5);
});

test('consolidation comparison accounts for origination fee', () => {
  const r = consolidationCompare([{ balance: 5_000, aprPct: 24, payment: 200 }, { balance: 3_000, aprPct: 20, payment: 120 }], 12, 36, 5);
  near(r.totalBalance, 8_000);
  near(r.consolidated.loanAmount, 8_421.05);
  assert.ok(r.current.feasible);
});

test('savings goal timing', () => {
  assert.equal(monthsToGoal(10_000, 4_000, 500), 12);
  assert.equal(monthsToGoal(1_000, 2_000, 0), 0);
  assert.equal(monthsToGoal(1_000, 0, 0), Infinity);
  assert.ok(monthsToGoalWithInterest(10_000, 4_000, 500, 4) <= 12);
});

test('auto loan taxes the price net of trade-in', () => {
  const r = autoLoan({ price: 30_000, downPayment: 3_000, tradeIn: 5_000, salesTaxPct: 6, fees: 500, aprPct: 7, months: 60 });
  near(r.tax, 1_500);
  near(r.financed, 24_000);
});

test('home equity borrowing limit', () => {
  const r = homeEquity({ homeValue: 400_000, mortgageBalance: 250_000, maxCltvPct: 85 });
  near(r.borrowable, 90_000);
  near(r.equity, 150_000);
});

test('budget totals and savings rate', () => {
  const b = budget(5_000, [{ label: 'Housing', amount: 1_500 }, { label: 'Food', amount: 600 }, { label: 'Other', amount: 0 }]);
  assert.equal(b.total, 2_100);
  assert.equal(b.remaining, 2_900);
  near(b.savingsRate, 58);
  assert.equal(b.breakdown.length, 2);
});

test('extra payments shorten amortization', () => {
  const base = amortizationByYear(200_000, 6, 360);
  const extra = amortizationByYear(200_000, 6, 360, 200);
  assert.equal(base.months, 360);
  assert.ok(extra.months < 300);
  assert.ok(extra.totalInterest < base.totalInterest);
});

test('helpers', () => {
  near(inflationAdjust(1_030, 3, 1), 1_000);
  assert.equal(round2(1.005), 1.01);
});
