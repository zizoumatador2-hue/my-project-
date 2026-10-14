/**
 * Pure financial math used by every calculator on the site.
 * No DOM access here — this module is unit tested in tests/unit/finance.test.ts.
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Fixed monthly payment for a fully amortizing loan. */
export function amortizedPayment(principal: number, aprPct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = aprPct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export interface LoanResult {
  payment: number;
  totalInterest: number;
  totalPaid: number;
  months: number;
}

export function loanSummary(principal: number, aprPct: number, months: number): LoanResult {
  const payment = amortizedPayment(principal, aprPct, months);
  const totalPaid = payment * months;
  return { payment, totalInterest: Math.max(0, totalPaid - principal), totalPaid, months };
}

/** Largest loan a given monthly payment supports (inverse of amortizedPayment). */
export function principalFromPayment(payment: number, aprPct: number, months: number): number {
  if (payment <= 0 || months <= 0) return 0;
  const r = aprPct / 100 / 12;
  if (r === 0) return payment * months;
  return (payment * (1 - Math.pow(1 + r, -months))) / r;
}

export interface YearRow {
  year: number;
  balance: number;
  interestPaid: number;
  principalPaid: number;
}

/** Year-by-year amortization, optionally with an extra monthly principal payment. */
export function amortizationByYear(principal: number, aprPct: number, months: number, extra = 0) {
  const r = aprPct / 100 / 12;
  const payment = amortizedPayment(principal, aprPct, months);
  let balance = principal;
  let month = 0;
  let totalInterest = 0;
  const rows: YearRow[] = [];
  let yi = 0;
  let yp = 0;
  while (balance > 0.005 && month < months) {
    const interest = balance * r;
    let toPrincipal = payment + extra - interest;
    if (toPrincipal > balance) toPrincipal = balance;
    balance -= toPrincipal;
    totalInterest += interest;
    yi += interest;
    yp += toPrincipal;
    month++;
    if (month % 12 === 0 || balance <= 0.005) {
      rows.push({ year: Math.ceil(month / 12), balance: Math.max(0, balance), interestPaid: yi, principalPaid: yp });
      yi = 0;
      yp = 0;
    }
  }
  return { payment, months: month, totalInterest, rows };
}

export interface PayoffResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** false when the payment never covers the monthly interest */
  paysOff: boolean;
  minimumToProgress: number;
}

/** Revolving balance payoff with a fixed monthly payment and no new charges. */
export function creditCardPayoff(balance: number, aprPct: number, monthlyPayment: number): PayoffResult {
  const r = aprPct / 100 / 12;
  const minimumToProgress = balance * r;
  if (balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0, paysOff: true, minimumToProgress: 0 };
  if (monthlyPayment <= minimumToProgress + 0.004) {
    return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, paysOff: false, minimumToProgress };
  }
  let b = balance;
  let months = 0;
  let interest = 0;
  let paid = 0;
  while (b > 0.005 && months < 1200) {
    const i = b * r;
    interest += i;
    b += i;
    const pay = Math.min(monthlyPayment, b);
    b -= pay;
    paid += pay;
    months++;
  }
  return { months, totalInterest: interest, totalPaid: paid, paysOff: true, minimumToProgress };
}

/** Monthly payment needed to clear a card balance in a set number of months. */
export function paymentToPayOffIn(balance: number, aprPct: number, months: number) {
  return amortizedPayment(balance, aprPct, months);
}

export type Compounding = 'daily' | 'monthly' | 'quarterly' | 'annually';
const periodsPerYear: Record<Compounding, number> = { daily: 365, monthly: 12, quarterly: 4, annually: 1 };

export interface GrowthYear {
  year: number;
  contributions: number;
  interest: number;
  balance: number;
}

/**
 * Future value with an initial deposit and end-of-month contributions.
 * Interest compounds at the chosen frequency; contributions are converted
 * using the equivalent monthly rate so every frequency stays consistent.
 */
export function compoundGrowth(
  initial: number,
  monthly: number,
  ratePct: number,
  years: number,
  compounding: Compounding = 'monthly',
  annualContributionIncreasePct = 0,
) {
  const n = periodsPerYear[compounding];
  const effectiveAnnual = Math.pow(1 + ratePct / 100 / n, n) - 1;
  const monthlyRate = Math.pow(1 + effectiveAnnual, 1 / 12) - 1;
  let balance = initial;
  let contributions = initial;
  let contrib = monthly;
  const rows: GrowthYear[] = [];
  const totalMonths = Math.round(years * 12);
  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate) + contrib;
    contributions += contrib;
    if (m % 12 === 0 || m === totalMonths) {
      rows.push({ year: Math.ceil(m / 12), contributions, interest: balance - contributions, balance });
      if (m % 12 === 0) contrib *= 1 + annualContributionIncreasePct / 100;
    }
  }
  return {
    futureValue: balance,
    totalContributions: contributions,
    totalInterest: balance - contributions,
    effectiveAnnualRate: effectiveAnnual,
    rows,
  };
}

/** Deflate a future amount into today's dollars. */
export function inflationAdjust(amount: number, inflationPct: number, years: number) {
  return amount / Math.pow(1 + inflationPct / 100, years);
}

/** Value of a CD at maturity given its APY (APY already reflects compounding). */
export function cdMaturity(deposit: number, apyPct: number, termMonths: number) {
  const value = deposit * Math.pow(1 + apyPct / 100, termMonths / 12);
  return { value, interest: value - deposit };
}

/** Convert a nominal APR with n compounding periods into APY. */
export function aprToApy(aprPct: number, periods = 12) {
  return (Math.pow(1 + aprPct / 100 / periods, periods) - 1) * 100;
}

export interface MortgageInput {
  homePrice: number;
  downPayment: number;
  ratePct: number;
  years: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly?: number;
  pmiRatePct?: number;
}

export function mortgagePayment(i: MortgageInput) {
  const loan = Math.max(0, i.homePrice - i.downPayment);
  const pi = amortizedPayment(loan, i.ratePct, i.years * 12);
  const tax = i.propertyTaxAnnual / 12;
  const insurance = i.insuranceAnnual / 12;
  const hoa = i.hoaMonthly ?? 0;
  const ltv = i.homePrice > 0 ? loan / i.homePrice : 0;
  const pmi = ltv > 0.8 && i.pmiRatePct ? (loan * (i.pmiRatePct / 100)) / 12 : 0;
  const total = pi + tax + insurance + hoa + pmi;
  return {
    loan,
    ltv,
    principalAndInterest: pi,
    tax,
    insurance,
    hoa,
    pmi,
    total,
    totalInterest: pi * i.years * 12 - loan,
  };
}

export interface AffordabilityInput {
  annualIncome: number;
  monthlyDebts: number;
  downPayment: number;
  ratePct: number;
  years: number;
  propertyTaxRatePct: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  frontEndPct?: number;
  backEndPct?: number;
}

/**
 * Home price supported by the 28% housing / 36% total-debt guideline.
 * Property tax scales with the price, so solve for price directly.
 */
export function affordability(i: AffordabilityInput) {
  const monthlyIncome = i.annualIncome / 12;
  const front = (i.frontEndPct ?? 28) / 100;
  const back = (i.backEndPct ?? 36) / 100;
  const maxHousing = Math.max(0, Math.min(monthlyIncome * front, monthlyIncome * back - i.monthlyDebts));
  const n = i.years * 12;
  const r = i.ratePct / 100 / 12;
  const factor = r === 0 ? 1 / n : r / (1 - Math.pow(1 + r, -n)); // payment per $ of loan
  const taxPerDollar = i.propertyTaxRatePct / 100 / 12;
  const fixed = i.insuranceAnnual / 12 + i.hoaMonthly;
  // housing = factor * (price - down) + taxPerDollar * price + fixed
  const price = Math.max(0, (maxHousing - fixed + factor * i.downPayment) / (factor + taxPerDollar));
  const loan = Math.max(0, price - i.downPayment);
  const pi = loan * factor;
  return {
    maxHousingPayment: maxHousing,
    homePrice: loan > 0 ? price : Math.min(price, i.downPayment),
    loan,
    principalAndInterest: pi,
    tax: price * taxPerDollar,
    limitedBy: monthlyIncome * front <= monthlyIncome * back - i.monthlyDebts ? 'housing ratio' : 'total debt ratio',
  };
}

export interface Debt {
  balance: number;
  aprPct: number;
  payment: number;
}

/** Compare paying debts as-is with a single consolidation loan. */
export function consolidationCompare(debts: Debt[], newAprPct: number, termMonths: number, feePct: number) {
  let currentInterest = 0;
  let currentMonths = 0;
  let currentPayment = 0;
  let feasible = true;
  for (const d of debts) {
    if (d.balance <= 0) continue;
    const p = creditCardPayoff(d.balance, d.aprPct, d.payment);
    if (!p.paysOff) feasible = false;
    currentInterest += p.totalInterest;
    currentMonths = Math.max(currentMonths, p.months);
    currentPayment += d.payment;
  }
  const totalBalance = debts.reduce((s, d) => s + Math.max(0, d.balance), 0);
  // Origination fees are typically deducted from proceeds, so borrow enough to net the balance.
  const loanAmount = feePct > 0 ? totalBalance / (1 - feePct / 100) : totalBalance;
  const loan = loanSummary(loanAmount, newAprPct, termMonths);
  const fee = loanAmount - totalBalance;
  return {
    totalBalance,
    current: { payment: currentPayment, months: currentMonths, interest: currentInterest, feasible },
    consolidated: { loanAmount, fee, payment: loan.payment, months: termMonths, interest: loan.totalInterest, cost: loan.totalInterest + fee },
    savings: feasible ? currentInterest - (loan.totalInterest + fee) : Infinity,
  };
}

/** Months needed to reach a savings target with fixed monthly deposits (no interest). */
export function monthsToGoal(target: number, current: number, monthly: number) {
  const gap = target - current;
  if (gap <= 0) return 0;
  if (monthly <= 0) return Infinity;
  return Math.ceil(gap / monthly);
}

/** Months needed with interest (APY) on the growing balance. */
export function monthsToGoalWithInterest(target: number, current: number, monthly: number, apyPct: number) {
  if (current >= target) return 0;
  if (monthly <= 0 && apyPct <= 0) return Infinity;
  const r = Math.pow(1 + apyPct / 100, 1 / 12) - 1;
  let b = current;
  for (let m = 1; m <= 1200; m++) {
    b = b * (1 + r) + monthly;
    if (b >= target) return m;
  }
  return Infinity;
}

export function autoLoan(i: {
  price: number;
  downPayment: number;
  tradeIn: number;
  salesTaxPct: number;
  fees: number;
  aprPct: number;
  months: number;
}) {
  const taxable = Math.max(0, i.price - i.tradeIn);
  const tax = taxable * (i.salesTaxPct / 100);
  const financed = Math.max(0, i.price + tax + i.fees - i.downPayment - i.tradeIn);
  const s = loanSummary(financed, i.aprPct, i.months);
  return { tax, financed, ...s, totalCost: s.totalPaid + i.downPayment + i.tradeIn };
}

export function homeEquity(i: { homeValue: number; mortgageBalance: number; maxCltvPct: number }) {
  const equity = i.homeValue - i.mortgageBalance;
  const borrowable = Math.max(0, i.homeValue * (i.maxCltvPct / 100) - i.mortgageBalance);
  return { equity, equityPct: i.homeValue > 0 ? (equity / i.homeValue) * 100 : 0, borrowable };
}

export interface BudgetLine {
  label: string;
  amount: number;
}

export function budget(income: number, lines: BudgetLine[]) {
  const total = lines.reduce((s, l) => s + (Number.isFinite(l.amount) ? Math.max(0, l.amount) : 0), 0);
  const remaining = income - total;
  return {
    total,
    remaining,
    savingsRate: income > 0 ? (remaining / income) * 100 : 0,
    breakdown: lines
      .filter((l) => l.amount > 0)
      .map((l) => ({ ...l, pctOfIncome: income > 0 ? (l.amount / income) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount),
  };
}
