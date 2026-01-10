// calc.js
import { clamp, memoize } from './utils.js';

export function setAsideEuro(p){
  return Math.max(0, (p.cash.now || 0) * (p.cash.setAsidePct || 0));
}
export function investableCash(p){
  return Math.max(0, (p.cash.now || 0) - setAsideEuro(p));
}

export function futureValue(principal, annualRatePct, years, monthly){
  const r = (annualRatePct || 0) / 100;
  const y = Math.max(0, years || 0);
  if (r === 0) return (principal || 0) + (monthly || 0) * 12 * y;
  return (principal || 0) * Math.pow(1 + r, y) + ((monthly || 0) * 12) * ((Math.pow(1 + r, y) - 1) / r);
}

export function realEstateValue(price, annualGrowthPct, years){
  const g = (annualGrowthPct || 0) / 100;
  const y = Math.max(0, years || 0);
  return (price || 0) * Math.pow(1 + g, y);
}

export function annuityMonthlyPayment(principal, annualRatePct, years){
  const P = Math.max(0, principal || 0);
  const i = ((annualRatePct || 0) / 100) / 12;
  const n = Math.max(0, Math.round((years || 0) * 12));
  if (n === 0) return 0;
  if (i === 0) return P / n;
  return P * (i / (1 - Math.pow(1 + i, -n)));
}

export function loanBalanceAfterMonths(principal, annualRatePct, monthlyPayment, months){
  const P = Math.max(0, principal || 0);
  const M = Math.max(0, monthlyPayment || 0);
  const i = ((annualRatePct || 0) / 100) / 12;
  const k = Math.max(0, Math.round(months || 0));
  if (k === 0) return P;
  if (i === 0) return Math.max(0, P - M * k);
  const pow = Math.pow(1 + i, k);
  const bal = P * pow - M * ((pow - 1) / i);
  return Math.max(0, bal);
}

export function rentCostFactor(p){
  const vacancy = clamp(Number(p.rent.vacancyRate || 0), 0, 1);
  const ins = clamp(Number(p.rent.insuranceRate || 0), 0, 1);
  const tax = clamp(Number(p.rent.taxRate || 0), 0, 1);
  const maint = clamp(Number(p.rent.maintenanceRate || 0), 0, 1);
  return clamp(vacancy + ins + tax + maint, 0, 10);
}

export function netMonthlyRent(p){
  const rent = Math.max(0, Number(p.rent.monthlyRent || 0));
  const cost = rentCostFactor(p);
  return rent * Math.max(0, 1 - cost);
}

export function compute(p){
  const horizon = Math.max(0, Number(p.horizonYears || 0));
  const setAside = setAsideEuro(p);
  const investable = investableCash(p);
  const downPayment = investable;

  const price = Number(p.realEstate.price || 0);
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);

  const loanMonthly = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct || 0), Number(p.loan.years || 0));

  const budget = Math.max(0, Number(p.monthlyBudget || 0));
  const extraSavedFromBudget = Math.max(0, budget - loanMonthly);
  const totalMonthlySaving = extraSavedFromBudget;

  const savingTotal = futureValue(0, Number(p.saving.annualRatePct || 0), horizon, totalMonthlySaving);
  const reValue = realEstateValue(price, Number(p.realEstate.annualGrowthPct || 0), horizon);

  const months = Math.round(Math.min(horizon, Number(p.loan.years || 0)) * 12);
  const loanBalance = loanBalanceAfterMonths(principal, Number(p.loan.annualRatePct || 0), loanMonthly, months);
  const equity = reValue - loanBalance;

  const rentEnabled = !!p.rent.enabled;
  const rentNetMonthly = rentEnabled ? netMonthlyRent(p) : 0;
  const yearsRented = rentEnabled ? Math.max(0, horizon - Number(p.rent.startAfterYears || 0)) : 0;
  const rentProfit = rentNetMonthly * 12 * yearsRented;

  const totalWealth = savingTotal + equity + rentProfit;

  return {
    setAside, investable,
    downPayment, principal,
    purchaseCost, totalCost,
    budget, loanMonthly,
    extraSavedFromBudget, totalMonthlySaving,
    savingTotal,
    reValue, loanBalance, equity,
    rentNetMonthly, rentProfit,
    totalWealth
  };
}

export function computeSavingsOnly(p){
  const horizon = Math.max(0, Number(p.horizonYears || 0));
  const investable = investableCash(p);
  const budget = Math.max(0, Number(p.monthlyBudget || 0));
  const totalMonthlySaving = budget;
  const savingTotal = futureValue(investable, Number(p.saving.annualRatePct || 0), horizon, totalMonthlySaving);
  return { savingTotal, totalWealth: savingTotal };
}

export function computeYearByYear(p){
  const horizon = Math.max(0, Number(p.horizonYears || 0));
  const investable = investableCash(p);
  const downPayment = investable;
  const price = Number(p.realEstate.price || 0);
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);
  const loanMonthly = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct || 0), Number(p.loan.years || 0));
  const budget = Math.max(0, Number(p.monthlyBudget || 0));
  const extraSavedFromBudget = Math.max(0, budget - loanMonthly);
  const totalMonthlySavingOnly = budget;
  const rentEnabled = !!p.rent.enabled;
  const rentStartYear = Number(p.rent.startAfterYears || 0);

  const timeline = [];
  for (let year = 0; year <= horizon; year++){
    const savingTotal = futureValue(0, Number(p.saving.annualRatePct || 0), year, extraSavedFromBudget);
    const reValue = realEstateValue(price, Number(p.realEstate.annualGrowthPct || 0), year);
    const months = Math.round(Math.min(year, Number(p.loan.years || 0)) * 12);
    const loanBalance = loanBalanceAfterMonths(principal, Number(p.loan.annualRatePct || 0), loanMonthly, months);
    const equity = reValue - loanBalance;

    const rentNetMonthly = rentEnabled ? netMonthlyRent(p) : 0;
    const yearsRented = rentEnabled ? Math.max(0, year - rentStartYear) : 0;
    const rentProfit = rentNetMonthly * 12 * yearsRented;
    const wealthWithRent = savingTotal + equity + rentProfit;
    const wealthWithoutRent = savingTotal + equity;

    const savingsOnlyTotal = futureValue(investable, Number(p.saving.annualRatePct || 0), year, totalMonthlySavingOnly);

    timeline.push({ year, wealthWithRent, wealthWithoutRent, savingsOnly: savingsOnlyTotal });
  }
  return timeline;
}

export function computeCashflowAndAmortization(p){
  const horizon = Math.max(0, Number(p.horizonYears || 0));
  const investable = investableCash(p);
  const downPayment = investable;
  const price = Number(p.realEstate.price || 0);
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);

  const monthlyPayment = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct || 0), Number(p.loan.years || 0));
  const loanTermMonths = Math.round(Number(p.loan.years || 0) * 12);
  const monthlyRate = ((Number(p.loan.annualRatePct || 0)) / 100) / 12;

  let balance = principal;
  const cashflow = [];
  const amort = [];

  const rentEnabled = !!p.rent.enabled;
  const rentStart = Number(p.rent.startAfterYears || 0);
  const monthlyRent = Number(p.rent.monthlyRent || 0);
  const vacancy = Number(p.rent.vacancyRate || 0);
  const insurance = Number(p.rent.insuranceRate || 0);
  const tax = Number(p.rent.taxRate || 0);
  const maint = Number(p.rent.maintenanceRate || 0);

  for (let year = 1; year <= horizon; year++){
    const startBalance = balance;
    const monthsElapsedBeforeYear = (year - 1) * 12;
    let monthsThisYear = 0;
    if (monthsElapsedBeforeYear >= loanTermMonths) monthsThisYear = 0;
    else monthsThisYear = Math.min(12, loanTermMonths - monthsElapsedBeforeYear);

    let interestPaid = 0;
    let principalPaid = 0;
    let totalPaid = 0;

    for (let m = 0; m < monthsThisYear; m++){
      const interest = balance * monthlyRate;
      let principalPayment = monthlyPayment - interest;
      let payment = monthlyPayment;
      if (balance <= 0) break;
      if (principalPayment > balance){
        principalPayment = balance;
        payment = interest + principalPayment;
      }
      interestPaid += interest;
      principalPaid += principalPayment;
      totalPaid += payment;
      balance = Math.max(0, balance - principalPayment);
    }

    const endBalance = balance;
    amort.push({ year, startBalance, paid: totalPaid, interest: interestPaid, principal: principalPaid, endBalance });

    const grossAnnual = (rentEnabled && year > rentStart) ? monthlyRent * 12 : 0;
    const vacancyAmt = grossAnnual * (vacancy || 0);
    const insuranceAmt = grossAnnual * (insurance || 0);
    const taxAmt = grossAnnual * (tax || 0);
    const maintenanceAmt = grossAnnual * (maint || 0);
    const netRent = grossAnnual - (vacancyAmt + insuranceAmt + taxAmt + maintenanceAmt);
    const loanPaymentThisYear = totalPaid;
    const netCash = netRent - loanPaymentThisYear;

    cashflow.push({ year, grossAnnual, vacancyAmt, insuranceAmt, taxAmt, maintenanceAmt, netRent, loanPaymentThisYear, netCash });
  }

  return { cashflow, amort };
}

export function computeMonthlyBreakdownForYear(p, year){
  const investable = investableCash(p);
  const downPayment = investable;
  const price = Number(p.realEstate.price || 0);
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);

  const monthlyPayment = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct || 0), Number(p.loan.years || 0));
  const monthlyRate = ((Number(p.loan.annualRatePct || 0)) / 100) / 12;
  const loanTermMonths = Math.round(Number(p.loan.years || 0) * 12);

  let balance = principal;
  const months = [];

  const rentEnabled = !!p.rent.enabled;
  const rentStartMonths = Math.round(Number(p.rent.startAfterYears || 0) * 12);
  const monthlyRent = Number(p.rent.monthlyRent || 0);
  const vacancy = Number(p.rent.vacancyRate || 0);
  const insurance = Number(p.rent.insuranceRate || 0);
  const tax = Number(p.rent.taxRate || 0);
  const maint = Number(p.rent.maintenanceRate || 0);

  const endMonthIndex = year * 12;
  for (let m = 0; m < endMonthIndex; m++){
    const monthIndex = (m % 12) + 1;

    const grossMonthly = (rentEnabled && m >= rentStartMonths) ? monthlyRent : 0;
    const vacancyAmt = grossMonthly * (vacancy || 0);
    const insuranceAmt = grossMonthly * (insurance || 0);
    const taxAmt = grossMonthly * (tax || 0);
    const maintenanceAmt = grossMonthly * (maint || 0);
    const netRent = grossMonthly - (vacancyAmt + insuranceAmt + taxAmt + maintenanceAmt);

    let interest = 0;
    let principalPayment = 0;
    let payment = 0;
    if (m < loanTermMonths && balance > 0 && monthlyPayment > 0){
      interest = balance * monthlyRate;
      principalPayment = monthlyPayment - interest;
      if (principalPayment > balance){
        principalPayment = balance;
        payment = interest + principalPayment;
      } else {
        payment = monthlyPayment;
      }
      balance = Math.max(0, balance - principalPayment);
    }

    const inRequestedYear = m >= (year - 1) * 12 && m < year * 12;
    if (inRequestedYear){
      months.push({ month: monthIndex, grossMonthly, netRent, loanPayment: payment, netCash: netRent - payment });
    }
  }
  return months;
}

export function computeMonthlyAmortizationForYear(p, year){
  const price = Number(p.realEstate.price || 0);
  const investable = investableCash(p);
  const downPayment = investable;
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);

  const monthlyPayment = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct || 0), Number(p.loan.years || 0));
  const monthlyRate = ((Number(p.loan.annualRatePct || 0)) / 100) / 12;
  const loanTermMonths = Math.round(Number(p.loan.years || 0) * 12);

  let balance = principal;
  const months = [];

  const endMonthIndex = year * 12;
  for (let m = 0; m < endMonthIndex; m++){
    const startBalance = balance;
    let interest = 0, principalPayment = 0, payment = 0;
    if (m < loanTermMonths && balance > 0 && monthlyPayment > 0){
      interest = balance * monthlyRate;
      principalPayment = monthlyPayment - interest;
      if (principalPayment > balance){
        principalPayment = balance;
        payment = interest + principalPayment;
      } else {
        payment = monthlyPayment;
      }
      balance = Math.max(0, balance - principalPayment);
    }

    const inRequestedYear = m >= (year - 1) * 12 && m < year * 12;
    if (inRequestedYear){
      months.push({ month: (m % 12) + 1, startBalance, interest, principalPayment, payment, endBalance: balance });
    }
  }
  return months;
}

// Memoized versions of expensive functions
let _computeMemoized, _computeSavingsOnlyMemoized, _computeYearByYearMemoized, _computeCashflowAndAmortizationMemoized;

export function computeMemoized(p){
  if (!_computeMemoized) _computeMemoized = memoize(compute);
  return _computeMemoized(p);
}
export function computeSavingsOnlyMemoized(p){
  if (!_computeSavingsOnlyMemoized) _computeSavingsOnlyMemoized = memoize(computeSavingsOnly);
  return _computeSavingsOnlyMemoized(p);
}
export function computeYearByYearMemoized(p){
  if (!_computeYearByYearMemoized) _computeYearByYearMemoized = memoize(computeYearByYear);
  return _computeYearByYearMemoized(p);
}
export function computeCashflowAndAmortizationMemoized(p){
  if (!_computeCashflowAndAmortizationMemoized) _computeCashflowAndAmortizationMemoized = memoize(computeCashflowAndAmortization);
  return _computeCashflowAndAmortizationMemoized(p);
}

