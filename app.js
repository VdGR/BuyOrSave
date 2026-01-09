// app.js — DONE: Total = savings (incl. overschot) + equity + rent profit [1]

const DEFAULTS = {
  horizonYears: 25,

  // Vast maandbudget dat je elke maand “wegzet” (lening + sparen)
  // Default = 1000 volgens je sheet scenario [1]
  monthlyBudget: 1000,

  cash: { now: 55250, setAsidePct: 0.15 }, // [1]
  saving: { annualRatePct: 2.0 },          // [1]

  realEstate: { price: 220000, annualGrowthPct: 3 }, // [1]
  // Extra aankoopkosten (notaris, registratierechten, kosten...) als fractie van prijs
  // Gebruik 0.10 = 10% als veilige aanname
  realEstatePurchaseCostPct: 0.10,

  loan: { annualRatePct: 4.0, years: 25 }, // [1]

  rent: {
    enabled: true,
    startAfterYears: 2,   // [1]
    monthlyRent: 800,     // [1]
    vacancyRate: 0.25,    // [1]
    insuranceRate: 0.10,  // [1]
    taxRate: 0.10,        // [1]
    maintenanceRate: 0.20 // [1]
  }
};

function deepClone(obj){
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}
const params = deepClone(DEFAULTS);

let lastCashflow = [];
let lastAmort = [];

const fmt = (n) => new Intl.NumberFormat("nl-BE", { style:"currency", currency:"EUR" }).format(Number(n) || 0);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

function getByPath(obj, path){ return path.split(".").reduce((o,k)=>o?.[k], obj); }
function setByPath(obj, path, value){
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((o,k)=>(o[k] ??= {}), obj);
  target[last] = value;
}
function coerceInputValue(el){
  if (el.type === "checkbox") return !!el.checked;
  const v = Number(el.value);
  return Number.isFinite(v) ? v : 0;
}
function bindInputs(){
  document.querySelectorAll("[data-path]").forEach((el) => {
    const path = el.dataset.path;
    const v = getByPath(params, path);

    if (el.type === "checkbox") el.checked = !!v;
    else if (v !== undefined) el.value = v;

    const handler = () => { setByPath(params, path, coerceInputValue(el)); render(); };
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });
}

// ---- Finance helpers ----
function setAsideEuro(p){ return Math.max(0, (p.cash.now||0) * (p.cash.setAsidePct||0)); }
function investableCash(p){ return Math.max(0, (p.cash.now||0) - setAsideEuro(p)); }

function futureValue(principal, annualRatePct, years, monthly){
  const r = (annualRatePct || 0) / 100;
  const y = Math.max(0, years || 0);
  if (r === 0) return (principal||0) + (monthly||0) * 12 * y;
  return (principal||0) * Math.pow(1+r, y) + ((monthly||0) * 12) * ((Math.pow(1+r, y) - 1) / r);
}

function realEstateValue(price, annualGrowthPct, years){
  const g = (annualGrowthPct || 0) / 100;
  const y = Math.max(0, years || 0);
  return (price || 0) * Math.pow(1+g, y);
}

function annuityMonthlyPayment(principal, annualRatePct, years){
  const P = Math.max(0, principal || 0);
  const i = ((annualRatePct || 0) / 100) / 12;
  const n = Math.max(0, Math.round((years || 0) * 12));
  if (n === 0) return 0;
  if (i === 0) return P / n;
  return P * (i / (1 - Math.pow(1+i, -n)));
}

function loanBalanceAfterMonths(principal, annualRatePct, monthlyPayment, months){
  const P = Math.max(0, principal || 0);
  const M = Math.max(0, monthlyPayment || 0);
  const i = ((annualRatePct || 0) / 100) / 12;
  const k = Math.max(0, Math.round(months || 0));
  if (k === 0) return P;
  if (i === 0) return Math.max(0, P - M * k);
  const pow = Math.pow(1+i, k);
  const bal = P * pow - M * ((pow - 1) / i);
  return Math.max(0, bal);
}

// rent
function rentCostFactor(p){
  const vacancy = clamp(Number(p.rent.vacancyRate||0), 0, 1);
  const ins = clamp(Number(p.rent.insuranceRate||0), 0, 1);
  const tax = clamp(Number(p.rent.taxRate||0), 0, 1);
  const maint = clamp(Number(p.rent.maintenanceRate||0), 0, 1);
  return clamp(vacancy + ins + tax + maint, 0, 10);
}
function netMonthlyRent(p){
  const rent = Math.max(0, Number(p.rent.monthlyRent||0));
  const cost = rentCostFactor(p);
  return rent * Math.max(0, 1 - cost); // default => 240/maand [1]
}

function compute(p){
  const horizon = Math.max(0, Number(p.horizonYears||0));

  // Auto: 15% apart + inbreng = investeerbaar [1]
  const setAside = setAsideEuro(p);
  const investable = investableCash(p);
  const downPayment = investable;

  // Aankoopkosten (notaris, registratierechten, dossierkosten...) en totale aankoop
  const price = Number(p.realEstate.price||0);
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;

  // Auto: leningbedrag = totale aankoop (prijs + kosten) - inbreng
  const principal = Math.max(0, totalCost - downPayment);

  // Auto: maandbetaling uit annuïteit [1]
  const loanMonthly = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct||0), Number(p.loan.years||0));

  // Budget: wat overblijft van monthlyBudget gaat sparen
  const budget = Math.max(0, Number(p.monthlyBudget||0));
  const extraSavedFromBudget = Math.max(0, budget - loanMonthly);
  const totalMonthlySaving = extraSavedFromBudget;

  // Sparen: start = 0 (investable is used as down payment) + maandelijks overschot
  // (Dit is bewust jouw "overschot sparen" model.)
  const savingTotal = futureValue(0, Number(p.saving.annualRatePct||0), horizon, totalMonthlySaving);

  // Vastgoed
  const reValue = realEstateValue(price, Number(p.realEstate.annualGrowthPct||0), horizon);

  // Leningrest (na min(horizon, looptijd))
  const months = Math.round(Math.min(horizon, Number(p.loan.years||0)) * 12);
  const loanBalance = loanBalanceAfterMonths(principal, Number(p.loan.annualRatePct||0), loanMonthly, months);

  // Equity = waarde - restschuld
  const equity = reValue - loanBalance;

  // Huurwinst over horizon [1]
  const rentEnabled = !!p.rent.enabled;
  const rentNetMonthly = rentEnabled ? netMonthlyRent(p) : 0;
  const yearsRented = rentEnabled ? Math.max(0, horizon - Number(p.rent.startAfterYears||0)) : 0;
  const rentProfit = rentNetMonthly * 12 * yearsRented; // default => 66.240 [1]

  // Dit is de KPI die jij vroeg:
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

function computeSavingsOnly(p){
  const horizon = Math.max(0, Number(p.horizonYears||0));
  const setAside = setAsideEuro(p);
  const investable = investableCash(p);
  
  // Geen vastgoed = geen lening, dus budget gaat volledig naar sparen
  const budget = Math.max(0, Number(p.monthlyBudget||0));
  const totalMonthlySaving = budget; // Volledig budget gaat naar sparen
  
  // Start met investable cash (dat kun je meteen sparen), plus maandelijks overschot
  const savingTotal = futureValue(investable, Number(p.saving.annualRatePct||0), horizon, totalMonthlySaving);
  
  return {
    savingTotal,
    totalWealth: savingTotal // Alleen sparen, geen vastgoed/equity/huur
  };
}

function computeYearByYear(p) {
  // Berekent vermogen jaar voor jaar voor beide scenario's
  const horizon = Math.max(0, Number(p.horizonYears||0));
  const investable = investableCash(p);
  
  // Scenario 1: Vastgoed (met en zonder huur)
  const downPayment = investable;
  const price = Number(p.realEstate.price||0);
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);
  const loanMonthly = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct||0), Number(p.loan.years||0));
  const budget = Math.max(0, Number(p.monthlyBudget||0));
  const extraSavedFromBudget = Math.max(0, budget - loanMonthly);
  
  // Scenario 2: Sparen
  const totalMonthlySavingOnly = budget;
  
  const rentEnabled = !!p.rent.enabled;
  const rentStartYear = Number(p.rent.startAfterYears||0);
  
  const timeline = [];
  
  for (let year = 0; year <= horizon; year++) {
    // Vastgoed scenario - WITH rental
    const savingTotal = futureValue(0, Number(p.saving.annualRatePct||0), year, extraSavedFromBudget);
    const reValue = realEstateValue(price, Number(p.realEstate.annualGrowthPct||0), year);
    const months = Math.round(Math.min(year, Number(p.loan.years||0)) * 12);
    const loanBalance = loanBalanceAfterMonths(principal, Number(p.loan.annualRatePct||0), loanMonthly, months);
    const equity = reValue - loanBalance;
    
    const rentNetMonthly = rentEnabled ? netMonthlyRent(p) : 0;
    const yearsRented = rentEnabled ? Math.max(0, year - rentStartYear) : 0;
    const rentProfit = rentNetMonthly * 12 * yearsRented;
    const wealthWithRent = savingTotal + equity + rentProfit;
    
    // Vastgoed scenario - WITHOUT rental
    const wealthWithoutRent = savingTotal + equity;
    
    // Sparen scenario
    const savingsOnlyTotal = futureValue(investable, Number(p.saving.annualRatePct||0), year, totalMonthlySavingOnly);
    
    timeline.push({
      year,
      wealthWithRent,
      wealthWithoutRent,
      savingsOnly: savingsOnlyTotal
    });
  }
  
  return timeline;
}

function renderTimelineChart(p) {
  const timeline = computeYearByYear(p);
  
  // Find breakeven points (first year where wealth > savingsOnly)
  let breakevenWithRent = null;
  let breakevenWithoutRent = null;
  
  for (let i = 1; i < timeline.length; i++) {
    if (!breakevenWithRent && timeline[i].wealthWithRent > timeline[i].savingsOnly) {
      breakevenWithRent = timeline[i].year;
    }
    if (!breakevenWithoutRent && timeline[i].wealthWithoutRent > timeline[i].savingsOnly) {
      breakevenWithoutRent = timeline[i].year;
    }
  }

  // Prepare arrays for drawing lines and labels
  const breakevenWithRentPoint = breakevenWithRent != null ? timeline.find(t=>t.year===breakevenWithRent) : null;
  const breakevenWithoutRentPoint = breakevenWithoutRent != null ? timeline.find(t=>t.year===breakevenWithoutRent) : null;
  
  // Canvas chart
  const canvas = document.querySelector("#timelineChart");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { left: 80, right: 40, top: 40, bottom: 40 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  
  // Find max value
  const allValues = timeline.flatMap(d => [d.wealthWithRent, d.wealthWithoutRent, d.savingsOnly]);
  const maxValue = Math.max(...allValues, 1);
  
  // Clear canvas
  ctx.fillStyle = "rgba(11, 16, 32, 1)";
  ctx.fillRect(0, 0, width, height);
  
  // Draw grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (graphHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  
  // Draw axes
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
  
  // Draw lines
  const colors = {
    withRent: "#4ade80",
    withoutRent: "#60a5fa",
    savingsOnly: "#f97316"
  };
  
  const drawLine = (data, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
      const x = padding.left + (graphWidth / (data.length - 1 || 1)) * i;
      const y = height - padding.bottom - ((data[i] / maxValue) * graphHeight);
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  
  drawLine(timeline.map(d => d.wealthWithRent), colors.withRent);
  drawLine(timeline.map(d => d.wealthWithoutRent), colors.withoutRent);
  drawLine(timeline.map(d => d.savingsOnly), colors.savingsOnly);

  // Draw breakeven vertical lines and labels (if enabled)
  const showBreakeven = document.querySelector('#showBreakEven')?.checked;
  const drawBreakeven = (point, label, color) => {
    if (!point || !showBreakeven) return;
    const i = point.year;
    const x = padding.left + (graphWidth / (timeline.length - 1 || 1)) * i;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4,4]);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = color;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label + ' ~' + point.year + 'j', x, padding.top + 14);
  };

  drawBreakeven(breakevenWithRentPoint, 'Met huur', colors.withRent);
  drawBreakeven(breakevenWithoutRentPoint, 'Geen huur', colors.withoutRent);
  
  // Draw labels
  ctx.fillStyle = "rgba(233, 236, 255, 0.7)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  
  // X-axis labels
  const step = Math.ceil(timeline.length / 6);
  for (let i = 0; i < timeline.length; i += step) {
    const x = padding.left + (graphWidth / (timeline.length - 1 || 1)) * i;
    ctx.fillText(timeline[i].year + "j", x, height - padding.bottom + 20);
  }
  
  // Y-axis labels
  ctx.textAlign = "right";
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (graphHeight / 5) * i;
    const value = maxValue * (1 - i / 5);
    ctx.fillText(fmt(value), padding.left - 10, y + 4);
  }
  
  // Legend
  const legendY = padding.top + 15;
  const drawLegendItem = (x, color, label) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, legendY, 12, 12);
    ctx.fillStyle = "rgba(233, 236, 255, 0.8)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 18, legendY + 10);
  };
  
  drawLegendItem(padding.left, colors.withRent, "Vastgoed (met huur)");
  drawLegendItem(padding.left + 160, colors.withoutRent, "Vastgoed (geen huur)");
  drawLegendItem(padding.left + 320, colors.savingsOnly, "Enkel sparen");
  
  // Display breakeven info
  const breakdownEl = document.querySelector("#timelineBreakdown");
  if (breakdownEl) {
    let breakdown = "";
    if (breakevenWithRent) {
      breakdown += `<div>✓ Met huur: beter na ~${breakevenWithRent} jaar</div>`;
    } else {
      breakdown += `<div>✗ Met huur: nooit beter (in deze periode)</div>`;
    }
    if (breakevenWithoutRent) {
      breakdown += `<div>✓ Zonder huur: beter na ~${breakevenWithoutRent} jaar</div>`;
    } else {
      breakdown += `<div>✗ Zonder huur: nooit beter (in deze periode)</div>`;
    }
    breakdownEl.innerHTML = breakdown;
  }

  // Fill timeline table if visible
  const tableWrapper = document.querySelector('#timelineTableWrapper');
  const tbody = document.querySelector('#timelineTable tbody');
  if (tableWrapper && tbody) {
    tbody.innerHTML = timeline.map(r => `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,.04);">${r.year}</td>
        <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,.04);">${fmt(r.wealthWithRent)}</td>
        <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,.04);">${fmt(r.wealthWithoutRent)}</td>
        <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,.04);">${fmt(r.savingsOnly)}</td>
      </tr>
    `).join('');
  }

  // Timeline canvas tooltip (shows values for nearest year)
  const tooltip = document.querySelector('#timelineTooltip');
  if (tooltip && canvas){
    canvas.onmousemove = function(ev){
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const i = Math.round((x - padding.left) / (graphWidth / (timeline.length - 1 || 1)));
      const idx = Math.max(0, Math.min(timeline.length - 1, i));
      const t = timeline[idx];
      if (!t){ tooltip.style.display = 'none'; return; }
      tooltip.innerHTML = `
        <div style="font-weight:700; margin-bottom:6px;">Jaar ${t.year}j</div>
        <div>Vastgoed (met huur): ${fmt(t.wealthWithRent)}</div>
        <div>Vastgoed (geen huur): ${fmt(t.wealthWithoutRent)}</div>
        <div>Enkel sparen: ${fmt(t.savingsOnly)}</div>
      `;
      tooltip.style.display = 'block';
      tooltip.style.left = Math.max(8, ev.clientX + 10) + 'px';
      tooltip.style.top = Math.max(8, ev.clientY + 10) + 'px';
    };
    canvas.onmouseleave = function(){ tooltip.style.display = 'none'; };
  }}

// Compute annual cashflow and amortization schedules
function computeCashflowAndAmortization(p){
  const horizon = Math.max(0, Number(p.horizonYears||0));
  const investable = investableCash(p);
  const downPayment = investable;
  const price = Number(p.realEstate.price||0);
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);

  const monthlyPayment = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct||0), Number(p.loan.years||0));
  const loanTermMonths = Math.round(Number(p.loan.years||0) * 12);
  const monthlyRate = ((Number(p.loan.annualRatePct||0))/100) / 12;

  let balance = principal;
  const cashflow = [];
  const amort = [];

  const rentEnabled = !!p.rent.enabled;
  const rentStart = Number(p.rent.startAfterYears||0);
  const monthlyRent = Number(p.rent.monthlyRent||0);
  const vacancy = Number(p.rent.vacancyRate||0);
  const insurance = Number(p.rent.insuranceRate||0);
  const tax = Number(p.rent.taxRate||0);
  const maint = Number(p.rent.maintenanceRate||0);

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
    const vacancyAmt = grossAnnual * (vacancy||0);
    const insuranceAmt = grossAnnual * (insurance||0);
    const taxAmt = grossAnnual * (tax||0);
    const maintenanceAmt = grossAnnual * (maint||0);
    const netRent = grossAnnual - (vacancyAmt + insuranceAmt + taxAmt + maintenanceAmt);
    const loanPaymentThisYear = totalPaid;
    const netCash = netRent - loanPaymentThisYear;

    cashflow.push({ year, grossAnnual, vacancyAmt, insuranceAmt, taxAmt, maintenanceAmt, netRent, loanPaymentThisYear, netCash });
  }

  return { cashflow, amort };
}

// Monthly breakdown for a specific year (returns months array for that year)
function computeMonthlyBreakdownForYear(p, year){
  const investable = investableCash(p);
  const downPayment = investable;
  const price = Number(p.realEstate.price||0);
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);

  const monthlyPayment = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct||0), Number(p.loan.years||0));
  const monthlyRate = ((Number(p.loan.annualRatePct||0))/100) / 12;
  const loanTermMonths = Math.round(Number(p.loan.years||0) * 12);

  let balance = principal;
  const months = [];

  const rentEnabled = !!p.rent.enabled;
  const rentStartMonths = Math.round(Number(p.rent.startAfterYears||0) * 12);
  const monthlyRent = Number(p.rent.monthlyRent||0);
  const vacancy = Number(p.rent.vacancyRate||0);
  const insurance = Number(p.rent.insuranceRate||0);
  const tax = Number(p.rent.taxRate||0);
  const maint = Number(p.rent.maintenanceRate||0);

  // Simulate all months up to the requested year to keep balance correct
  const endMonthIndex = year * 12; // exclusive
  for (let m = 0; m < endMonthIndex; m++){
    const monthIndex = (m % 12) + 1;

    // Determine rent this month
    const grossMonthly = (rentEnabled && m >= rentStartMonths) ? monthlyRent : 0;
    const vacancyAmt = grossMonthly * (vacancy||0);
    const insuranceAmt = grossMonthly * (insurance||0);
    const taxAmt = grossMonthly * (tax||0);
    const maintenanceAmt = grossMonthly * (maint||0);
    const netRent = grossMonthly - (vacancyAmt + insuranceAmt + taxAmt + maintenanceAmt);

    // Loan payment this month
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

    // Collect month only if within requested year
    const inRequestedYear = m >= (year - 1) * 12 && m < year * 12;
    if (inRequestedYear){
      months.push({
        month: monthIndex,
        grossMonthly,
        netRent,
        loanPayment: payment,
        netCash: netRent - payment
      });
    }
  }

  return months;
}

function renderMonthlyTable(monthly){
  const tbody = document.querySelector('#monthlyCashflowTable tbody');
  if (!tbody) return;
  tbody.innerHTML = monthly.map(m => `
    <tr>
      <td style="text-align:center">M${m.month}</td>
      <td class="numeric">${fmt(m.grossMonthly)}</td>
      <td class="numeric">${fmt(m.netRent)}</td>
      <td class="numeric">${fmt(m.loanPayment)}</td>
      <td class="numeric">${fmt(m.netCash)}</td>
    </tr>
  `).join('');
}

// Compute monthly amortization details for a specific year
function computeMonthlyAmortizationForYear(p, year){
  const price = Number(p.realEstate.price||0);
  const investable = investableCash(p);
  const downPayment = investable;
  const purchaseCostPct = Number(p.realEstatePurchaseCostPct || 0);
  const purchaseCost = price * purchaseCostPct;
  const totalCost = price + purchaseCost;
  const principal = Math.max(0, totalCost - downPayment);

  const monthlyPayment = annuityMonthlyPayment(principal, Number(p.loan.annualRatePct||0), Number(p.loan.years||0));
  const monthlyRate = ((Number(p.loan.annualRatePct||0))/100) / 12;
  const loanTermMonths = Math.round(Number(p.loan.years||0) * 12);

  let balance = principal;
  const months = [];

  const endMonthIndex = year * 12; // exclusive
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

function renderChart(values){
  const el = document.querySelector("#chart");
  if (!el) return;
  const max = Math.max(...values.map(v => v.value), 1);
  el.innerHTML = values.map(v => {
    const h = clamp((v.value / max) * 100, 4, 100);
    return `<div class="bar" style="height:${h}%"><span>${v.label}<small>${fmt(v.value)}</small></span></div>`;
  }).join("");
}

function renderComparisonCharts(out, outSavingsOnly){
  // Chart 1: Comparison WITH rental income
  const chartWithRent = document.querySelector("#chartWithRent");
  if (chartWithRent) {
    // Render two compact cards side-by-side
    const left = { label: "Vastgoed (met huur)", value: out.totalWealth };
    const right = { label: "Enkel sparen", value: outSavingsOnly.totalWealth };
    const max = Math.max(left.value, right.value, 1);

    chartWithRent.innerHTML = `
      <div class="compare-card">
        <div class="compare-label">${left.label}</div>
        <div class="compare-value">${fmt(left.value)}</div>
        <div class="compare-mini-bar" style="width:${clamp((left.value/max)*100,4,100)}%;"></div>
        <div class="compare-small">${fmt(left.value)}</div>
      </div>
      <div class="compare-card">
        <div class="compare-label">${right.label}</div>
        <div class="compare-value">${fmt(right.value)}</div>
        <div class="compare-mini-bar" style="width:${clamp((right.value/max)*100,4,100)}%; background:linear-gradient(90deg,#f97316,#f59e0b);"></div>
        <div class="compare-small">${fmt(right.value)}</div>
      </div>
    `;
  }

  // Chart 2: Comparison WITHOUT rental income (pure equity vs savings)
  const wealthWithoutRent = out.savingTotal + out.equity;
  const chartWithoutRent = document.querySelector("#chartWithoutRent");
  if (chartWithoutRent) {
    const left = { label: "Vastgoed (geen huur)", value: wealthWithoutRent };
    const right = { label: "Enkel sparen", value: outSavingsOnly.totalWealth };
    const max = Math.max(left.value, right.value, 1);

    chartWithoutRent.innerHTML = `
      <div class="compare-card">
        <div class="compare-label">${left.label}</div>
        <div class="compare-value">${fmt(left.value)}</div>
        <div class="compare-mini-bar" style="width:${clamp((left.value/max)*100,4,100)}%;"></div>
        <div class="compare-small">${fmt(left.value)}</div>
      </div>
      <div class="compare-card">
        <div class="compare-label">${right.label}</div>
        <div class="compare-value">${fmt(right.value)}</div>
        <div class="compare-mini-bar" style="width:${clamp((right.value/max)*100,4,100)}%; background:linear-gradient(90deg,#f97316,#f59e0b);"></div>
        <div class="compare-small">${fmt(right.value)}</div>
      </div>
    `;
  }

  // Summary: welke is beter?
  const summaryEl = document.querySelector("#scenarioComparison");
  if (summaryEl) {
    const diff = out.totalWealth - outSavingsOnly.totalWealth;
    const percentDiff = ((diff / outSavingsOnly.totalWealth) * 100).toFixed(1);
    let message = "";
    
    if (diff > 0) {
      message = `<strong style="color:#4ade80">✓ Vastgoed is beter</strong><br/>
        +${fmt(diff)} extra vermogen (${percentDiff}% meer)`;
    } else if (diff < 0) {
      message = `<strong style="color:#f87171">✗ Enkel sparen is beter</strong><br/>
        +${fmt(Math.abs(diff))} extra vermogen (${Math.abs(percentDiff)}% meer)`;
    } else {
      message = `<strong style="color:#facc15">= Gelijk</strong><br/>
        Beide scenario's resulteren in hetzelfde vermogen`;
    }
    summaryEl.innerHTML = message;
  }
}

function setText(sel, text){
  const el = document.querySelector(sel);
  if (el) el.textContent = text;
}

function render(){
  const out = compute(params);
  const outSavingsOnly = computeSavingsOnly(params);

  setText("#subtitle",
    `${params.horizonYears} jaar • budget ${fmt(params.monthlyBudget)}/m • sparen ${Number(params.saving.annualRatePct).toFixed(1)}% • vastgoed ${Number(params.realEstate.annualGrowthPct).toFixed(2)}%`
  );

  setText("#kpiSetAside", fmt(out.setAside));
  setText("#kpiInvestable", fmt(out.investable));
  setText("#kpiDownPayment", fmt(out.downPayment));
  setText("#kpiPrincipal", fmt(out.principal));
  setText("#kpiPurchaseCosts", fmt(out.purchaseCost));
  setText("#kpiPurchaseCostsPct", (Number(params.realEstatePurchaseCostPct||0) * 100).toFixed(1) + "%");
  setText("#kpiTotalPurchase", fmt(out.totalCost));

  setText("#kpiMonthlyBudget", fmt(out.budget));
  setText("#kpiLoanMonthly", fmt(out.loanMonthly));
  setText("#kpiExtraSaved", fmt(out.extraSavedFromBudget));
  setText("#kpiTotalMonthlySaving", fmt(out.totalMonthlySaving));

  setText("#kpiSaving", fmt(out.savingTotal));
  setText("#kpiRE", fmt(out.reValue));
  setText("#kpiLoanBalance", fmt(out.loanBalance));
  setText("#kpiEquity", fmt(out.equity));

  setText("#kpiRentNetMonthly", fmt(out.rentNetMonthly));
  setText("#kpiRentProfit", fmt(out.rentProfit));

  setText("#kpiTotalWealth", fmt(out.totalWealth));

  renderChart([
    { label: "Sparen", value: out.savingTotal },
    { label: "Equity", value: out.equity },
    { label: "Totaal (sparen+equity+huur)", value: out.totalWealth }
  ]);

  // Savings-only scenario
  setText("#savingsOnlyTotal", fmt(outSavingsOnly.savingTotal));

  // Comparison charts
  renderComparisonCharts(out, outSavingsOnly);

  // Timeline chart
  renderTimelineChart(params);

  // Update timeline CSV download handler (repopulate latest timeline on click)
  document.querySelector('#downloadTimelineCsv')?.addEventListener('click', () => {
    const timeline = computeYearByYear(params);
    const rows = [['Year','Vastgoed (met huur)','Vastgoed (geen huur)','Enkel sparen']];
    timeline.forEach(r => rows.push([r.year, r.wealthWithRent, r.wealthWithoutRent, r.savingsOnly]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `timeline-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // Toggle timeline table
  document.querySelector('#toggleTimelineTable')?.addEventListener('click', ()=>{
    const el = document.querySelector('#timelineTableWrapper');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  });

  // Break-even checkbox toggle (re-render chart when changed)
  document.querySelector('#showBreakEven')?.addEventListener('change', ()=> renderTimelineChart(params));

  // Compute cashflow & amortization and populate tables
  const { cashflow, amort } = computeCashflowAndAmortization(params);
  lastCashflow = cashflow;
  lastAmort = amort;

  const cashTbody = document.querySelector('#cashflowTable tbody');
  if (cashTbody){
    cashTbody.innerHTML = cashflow.map(r => `
      <tr>
        <td>${r.year}</td>
        <td class="numeric">${fmt(r.grossAnnual)}</td>
        <td class="numeric">${fmt(r.netRent)}</td>
        <td class="numeric">${fmt(r.loanPaymentThisYear)}</td>
        <td class="numeric">${fmt(r.netCash)}</td>
      </tr>
    `).join('');
  }

  const amortTbody = document.querySelector('#amortTable tbody');
  if (amortTbody){
    amortTbody.innerHTML = amort.map(r => `
      <tr class="amort-row" data-year="${r.year}">
        <td><button class="amort-toggle-btn" data-year="${r.year}" aria-expanded="false">▶</button> ${r.year}</td>
        <td class="numeric">${fmt(r.startBalance)}</td>
        <td class="numeric">${fmt(r.paid)}</td>
        <td class="numeric">${fmt(r.interest)}</td>
        <td class="numeric">${fmt(r.principal)}</td>
        <td class="numeric">${fmt(r.endBalance)}</td>
      </tr>
    `).join('');

    // Attach toggle handlers
    document.querySelectorAll('.amort-toggle-btn').forEach(btn => {
      btn.onclick = (e) => {
        const yr = Number(btn.dataset.year);
        toggleAmortDetails(yr, btn);
      };
    });

    // Expand/collapse all
    const toggleExpandBtn = document.querySelector('#toggleExpandAmort');
    if (toggleExpandBtn){
      toggleExpandBtn.onclick = ()=>{
        const pressed = toggleExpandBtn.getAttribute('aria-pressed') === 'true';
        if (!pressed){
          // expand all
          document.querySelectorAll('.amort-row').forEach(row => {
            const yr = Number(row.dataset.year);
            const btn = row.querySelector('.amort-toggle-btn');
            const detail = document.querySelector(`tr.amort-details[data-year="${yr}"]`);
            if (!detail && btn) toggleAmortDetails(yr, btn);
          });
          toggleExpandBtn.setAttribute('aria-pressed','true');
          toggleExpandBtn.textContent = 'Dichtklappen alles';
        } else {
          // collapse all
          document.querySelectorAll('tr.amort-details').forEach(d => d.remove());
          document.querySelectorAll('.amort-toggle-btn').forEach(b => { b.setAttribute('aria-expanded','false'); b.textContent='▶'; });
          toggleExpandBtn.setAttribute('aria-pressed','false');
          toggleExpandBtn.textContent = 'Uitklappen alles';
        }
      };
    }

    // Toggle detail function (in render scope so it can access params)
    function toggleAmortDetails(year, btn){
      const existing = document.querySelector(`tr.amort-details[data-year="${year}"]`);
      if (existing){
        existing.remove();
        btn.setAttribute('aria-expanded','false');
        btn.textContent = '▶';
        return;
      }

      // Compute monthly amortization for that year and insert a detail row
      const months = computeMonthlyAmortizationForYear(params, year);
      const rowsHtml = months.length ? months.map(m => `
          <tr>
            <td style="text-align:center">M${m.month}</td>
            <td class="numeric">${fmt(m.startBalance)}</td>
            <td class="numeric">${fmt(m.interest)}</td>
            <td class="numeric">${fmt(m.principalPayment)}</td>
            <td class="numeric">${fmt(m.payment)}</td>
            <td class="numeric">${fmt(m.endBalance)}</td>
          </tr>
        `).join('') : `<tr><td colspan="6" style="text-align:center; padding:8px 0; color:var(--muted);">Lening volledig afbetaald</td></tr>`;

      const detailHtml = `
        <tr class="amort-details" data-year="${year}">
          <td colspan="6">
            <div style="overflow:auto;">
              <table class="nested-table" aria-label="Maandelijkse amortisatie">
                <thead><tr><th>Maand</th><th>Startsald</th><th>Rente</th><th>Kapitaal</th><th>Betaling</th><th>Eindsaldo</th></tr></thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      `;

      const parentRow = document.querySelector(`tr.amort-row[data-year="${year}"]`);
      if (parentRow) parentRow.insertAdjacentHTML('afterend', detailHtml);
      btn.setAttribute('aria-expanded','true');
      btn.textContent = '▼';
    }
  }

  // Populate monthly year select and default to year 3 (if within horizon)
  const monthlyYearSelect = document.querySelector('#monthlyYearSelect');
  const monthlyWrapper = document.querySelector('#monthlyCashflowWrapper');
  const horizon = Math.max(1, Number(params.horizonYears||0));
  if (monthlyYearSelect){
    monthlyYearSelect.innerHTML = Array.from({length: horizon}, (_,i)=> `<option value="${i+1}">${i+1}</option>`).join('');
    const defaultYear = Math.min(3, horizon);
    monthlyYearSelect.value = defaultYear;

    // Show monthly wrapper by default (user requested "Toon maandelijkse breakdown Jaar: 3")
    if (monthlyWrapper) {
      monthlyWrapper.style.display = 'block';
      renderMonthlyTable(computeMonthlyBreakdownForYear(params, defaultYear));
      const heading = document.querySelector('#monthlyHeading');
      if (heading) heading.textContent = `Maandelijkse breakdown — Jaar ${defaultYear}`;
    }

    // Use .onchange to avoid duplicate handlers
    monthlyYearSelect.setAttribute('aria-label', 'Selecteer jaar voor maandelijkse breakdown');
    monthlyYearSelect.onchange = (e)=>{
      const y = Number(e.target.value || 1);
      const months = computeMonthlyBreakdownForYear(params, y);
      renderMonthlyTable(months);
      const heading = document.querySelector('#monthlyHeading');
      if (heading) heading.textContent = `Maandelijkse breakdown — Jaar ${y}`;
    };

    // Export monthly CSV
    const exportMonthlyBtn = document.querySelector('#exportMonthlyCsv');
    if (exportMonthlyBtn){
      exportMonthlyBtn.setAttribute('aria-label', 'Exporteer maandelijkse breakdown als CSV');
      exportMonthlyBtn.onclick = ()=>{
        const y = Number(monthlyYearSelect?.value || 1);
        const months = computeMonthlyBreakdownForYear(params, y);
        const rows = [['Maand','Huur bruto','Netto huur','Lening (mnd)','Netto cashflow']];
        months.forEach(m => rows.push([m.month, m.grossMonthly.toFixed(2), m.netRent.toFixed(2), m.loanPayment.toFixed(2), m.netCash.toFixed(2)]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `monthly-${y}-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      };
    }
  }

  // Toggle monthly table using .onclick to avoid duplicate listeners
  const toggleMonthlyBtn = document.querySelector('#toggleMonthlyCashflow');
  if (toggleMonthlyBtn && monthlyWrapper){
    toggleMonthlyBtn.onclick = ()=>{
      monthlyWrapper.style.display = monthlyWrapper.style.display === 'none' ? 'block' : 'none';
      if (monthlyWrapper.style.display === 'block'){
        const y = Number(monthlyYearSelect?.value || Math.min(3, horizon));
        renderMonthlyTable(computeMonthlyBreakdownForYear(params, y));
      }
      // Accessibility: update aria-pressed / aria-expanded
      toggleMonthlyBtn.setAttribute('aria-pressed', monthlyWrapper.style.display === 'block');
      toggleMonthlyBtn.setAttribute('aria-expanded', monthlyWrapper.style.display === 'block');
    };

    // Initialize aria attributes
    toggleMonthlyBtn.setAttribute('aria-controls', 'monthlyCashflowWrapper');
    toggleMonthlyBtn.setAttribute('aria-pressed', monthlyWrapper.style.display === 'block');
    toggleMonthlyBtn.setAttribute('aria-expanded', monthlyWrapper.style.display === 'block');
  }

  // Add simple hover tooltips to comparison cards
  document.querySelectorAll('#chartWithRent .compare-card, #chartWithoutRent .compare-card').forEach(card=>{
    const label = card.querySelector('.compare-label')?.textContent || '';
    const val = card.querySelector('.compare-value')?.textContent || '';
    card.setAttribute('title', `${label}: ${val}`);
    card.style.cursor = 'help';
  });
}


function encodeParamsToHash(p){
  try{
    return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  }catch(e){
    return encodeURIComponent(JSON.stringify(p));
  }
}
function decodeParamsFromHash(s){
  try{
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  }catch(e){
    try{ return JSON.parse(decodeURIComponent(s)); }catch(e2){ return null; }
  }
}

function applyParamsFromHash(){
  const h = location.hash.slice(1);
  if (!h) return false;
  const decoded = decodeParamsFromHash(h);
  if (!decoded) return false;
  Object.keys(params).forEach(k => delete params[k]);
  Object.assign(params, decoded);

  // Update inputs
  document.querySelectorAll("[data-path]").forEach(el => {
    const path = el.dataset.path;
    const v = getByPath(params, path);
    if (el.type === "checkbox") el.checked = !!v;
    else if (v !== undefined) el.value = v;
  });

  return true;
}

function getShareUrl(){
  const hash = encodeParamsToHash(params);
  return location.origin + location.pathname + '#' + hash;
}

function copyLink(){
  const url = getShareUrl();
  navigator.clipboard?.writeText(url).then(()=>{
    setText('#copyStatus','Link gekopieerd');
    setTimeout(()=> setText('#copyStatus',''), 2500);
  }).catch(()=>{ alert('Copy failed - here is the link:\n' + url); });
}

function exportCSV(){
  const out = compute(params);
  const timeline = computeYearByYear(params);
  const rows = [];
  rows.push(["Key","Value"]);
  rows.push(["Horizon (jaren)", params.horizonYears]);
  rows.push(["Maandbudget", params.monthlyBudget]);
  rows.push(["Huidig spaargeld", fmt(params.cash.now)]);
  rows.push(["Aankoopprijs", fmt(params.realEstate.price)]);
  rows.push(["Aankoopkosten (%)", (Number(params.realEstatePurchaseCostPct||0)*100).toFixed(1) + "%"]);
  rows.push(["Aankoopkosten (EUR)", fmt(out.purchaseCost)]);
  rows.push(["Totale aankoop", fmt(out.totalCost)]);
  rows.push(["Totale vermogen (vastgoed)", fmt(out.totalWealth)]);
  rows.push(["Totale vermogen (enkel sparen)", fmt(computeSavingsOnly(params).totalWealth)]);
  rows.push([]);
  rows.push(["Year","Vastgoed (met huur)","Vastgoed (geen huur)","Enkel sparen"]);
  timeline.forEach(r=> rows.push([r.year, r.wealthWithRent, r.wealthWithoutRent, r.savingsOnly]));

  const csv = rows.map(r => r.map(c => typeof c === 'number' ? c : '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scenario-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function reset(){
  const fresh = deepClone(DEFAULTS);
  Object.keys(params).forEach(k => delete params[k]);
  Object.assign(params, fresh);

  document.querySelectorAll("[data-path]").forEach(el => {
    const path = el.dataset.path;
    const v = getByPath(params, path);
    if (el.type === "checkbox") el.checked = !!v;
    else el.value = v;
  });

  render();
}

document.querySelector("#resetBtn")?.addEventListener("click", reset);

// Apply params from URL if present
applyParamsFromHash();

bindInputs();

// Wire copy link and export buttons
document.querySelector('#copyLinkBtn')?.addEventListener('click', copyLink);
document.querySelector('#exportCsvBtn')?.addEventListener('click', exportCSV);

// Export cashflow CSV
document.querySelector('#exportCashflowCsv')?.addEventListener('click', ()=>{
  const rows = [['Year','GrossRent','NetRent','LoanPaidYear','NetCash']];
  lastCashflow.forEach(r => rows.push([r.year, r.grossAnnual.toFixed(2), r.netRent.toFixed(2), r.loanPaymentThisYear.toFixed(2), r.netCash.toFixed(2)]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `cashflow-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// Export amortization CSV
document.querySelector('#exportAmortCsv')?.addEventListener('click', ()=>{
  const rows = [['Year','StartBalance','Paid','Interest','Principal','EndBalance']];
  lastAmort.forEach(r => rows.push([r.year, r.startBalance.toFixed(2), r.paid.toFixed(2), r.interest.toFixed(2), r.principal.toFixed(2), r.endBalance.toFixed(2)]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `amortisation-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

render();