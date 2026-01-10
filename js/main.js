// main.js - Orchestrates UI rendering and event delegation
import { t, applyTranslations, initLanguageSelector, setLang } from './i18n.js';
import { fmt, deepClone, clamp } from './utils.js';
import { DEFAULTS } from './defaults.js';
import {
  computeMemoized,
  computeSavingsOnlyMemoized,
  computeYearByYearMemoized,
  computeCashflowAndAmortizationMemoized,
  computeMonthlyBreakdownForYear,
  computeMonthlyAmortizationForYear
} from './calc.js';
import { params, encodeParamsToHash, decodeParamsFromHash, applyParamsFromHash, getShareUrl, syncInputsFromParams } from './state.js';
import { bindInputs, setRenderCallback } from './handlers.js';

let lastCashflow = [];
let lastAmort = [];
let previousValues = {};

// DOM Cache: store frequently accessed elements
const domCache = {};
function cacheDOM(selector){
  if (!domCache[selector]){
    domCache[selector] = document.querySelector(selector);
  }
  return domCache[selector];
}

function setText(sel, text){
  const el = cacheDOM(sel);
  if (!el) return;
  const prev = previousValues[sel];
  const changed = prev !== undefined && prev !== text;
  el.textContent = text;
  previousValues[sel] = text;
  if (changed){
    el.classList.remove('value-changed');
    void el.offsetWidth; // Force reflow
    el.classList.add('value-changed');
    setTimeout(() => el.classList.remove('value-changed'), 600);
  }
}

function renderTimelineChart(p){
  const timeline = computeYearByYearMemoized(p);
  let breakevenWithRent = null;
  let breakevenWithoutRent = null;
  for (let i = 1; i < timeline.length; i++) {
    if (!breakevenWithRent && timeline[i].wealthWithRent > timeline[i].savingsOnly) breakevenWithRent = timeline[i].year;
    if (!breakevenWithoutRent && timeline[i].wealthWithoutRent > timeline[i].savingsOnly) breakevenWithoutRent = timeline[i].year;
  }
  const breakevenWithRentPoint = breakevenWithRent != null ? timeline.find(ti => ti.year === breakevenWithRent) : null;
  const breakevenWithoutRentPoint = breakevenWithoutRent != null ? timeline.find(ti => ti.year === breakevenWithoutRent) : null;

  const canvas = document.querySelector('#timelineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { left: 80, right: 40, top: 40, bottom: 40 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const allValues = timeline.flatMap(d => [d.wealthWithRent, d.wealthWithoutRent, d.savingsOnly]);
  const maxValue = Math.max(...allValues, 1);
  ctx.fillStyle = 'rgba(11, 16, 32, 1)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (graphHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
  const colors = { withRent: '#4ade80', withoutRent: '#60a5fa', savingsOnly: '#f97316' };
  const drawLine = (data, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = padding.left + (graphWidth / (data.length - 1 || 1)) * i;
      const y = height - padding.bottom - ((data[i] / maxValue) * graphHeight);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  drawLine(timeline.map(d => d.wealthWithRent), colors.withRent);
  drawLine(timeline.map(d => d.wealthWithoutRent), colors.withoutRent);
  drawLine(timeline.map(d => d.savingsOnly), colors.savingsOnly);
  const showBreakeven = document.querySelector('#showBreakEven')?.checked;
  const drawBreakeven = (point, label, color) => {
    if (!point || !showBreakeven) return;
    const i = point.year;
    const x = padding.left + (graphWidth / (timeline.length - 1 || 1)) * i;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label + ' ~' + point.year + t('unit.yearShort'), x, padding.top + 14);
  };
  drawBreakeven(breakevenWithRentPoint, t('compare.withRent'), colors.withRent);
  drawBreakeven(breakevenWithoutRentPoint, t('compare.withoutRent'), colors.withoutRent);
  ctx.fillStyle = 'rgba(233, 236, 255, 0.7)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  const step = Math.ceil(timeline.length / 6);
  for (let i = 0; i < timeline.length; i += step) {
    const x = padding.left + (graphWidth / (timeline.length - 1 || 1)) * i;
    ctx.fillText(timeline[i].year + t('unit.yearShort'), x, height - padding.bottom + 20);
  }
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (graphHeight / 5) * i;
    const value = maxValue * (1 - i / 5);
    ctx.fillText(fmt(value), padding.left - 10, y + 4);
  }
  const legendY = padding.top + 15;
  const drawLegendItem = (x, color, label) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, legendY, 12, 12);
    ctx.fillStyle = 'rgba(233, 236, 255, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 18, legendY + 10);
  };
  drawLegendItem(padding.left, colors.withRent, t('compare.withRent'));
  drawLegendItem(padding.left + 160, colors.withoutRent, t('compare.withoutRent'));
  drawLegendItem(padding.left + 320, colors.savingsOnly, t('compare.savings'));

  const breakdownEl = document.querySelector('#timelineBreakdown');
  if (breakdownEl) {
    let breakdown = '';
    breakdown += breakevenWithRent ? `<div>✓ ${t('breakeven.withRentBetterAfter', { year: breakevenWithRent })}</div>` : `<div>✗ ${t('breakeven.withRentNeverBetter')}</div>`;
    breakdown += breakevenWithoutRent ? `<div>✓ ${t('breakeven.withoutRentBetterAfter', { year: breakevenWithoutRent })}</div>` : `<div>✗ ${t('breakeven.withoutRentNeverBetter')}</div>`;
    breakdownEl.innerHTML = breakdown;
  }
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
  const tooltip = document.querySelector('#timelineTooltip');
  if (tooltip && canvas){
    canvas.onmousemove = function(ev){
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const i = Math.round((x - padding.left) / (graphWidth / (timeline.length - 1 || 1)));
      const idx = Math.max(0, Math.min(timeline.length - 1, i));
      const row = timeline[idx];
      if (!row){ tooltip.style.display = 'none'; return; }
      tooltip.innerHTML = `
        <div style="font-weight:700; margin-bottom:6px;">${t('table.year')} ${row.year}${t('unit.yearShort')}</div>
        <div>${t('compare.withRent')}: ${fmt(row.wealthWithRent)}</div>
        <div>${t('compare.withoutRent')}: ${fmt(row.wealthWithoutRent)}</div>
        <div>${t('compare.savings')}: ${fmt(row.savingsOnly)}</div>
      `;
      tooltip.style.display = 'block';
      tooltip.style.left = Math.max(8, ev.clientX + 10) + 'px';
      tooltip.style.top = Math.max(8, ev.clientY + 10) + 'px';
    };
    canvas.onmouseleave = function(){ tooltip.style.display = 'none'; };
  }
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

function renderChart(values){
  const el = document.querySelector('#chart');
  if (!el) return;
  const max = Math.max(...values.map(v => v.value), 1);
  el.innerHTML = values.map(v => {
    const h = clamp((v.value / max) * 100, 4, 100);
    return `<div class="bar" style="height:${h}%"><span>${v.label}<small>${fmt(v.value)}</small></span></div>`;
  }).join('');
}

function renderComparisonCharts(out, outSavingsOnly){
  const chartWithRent = document.querySelector('#chartWithRent');
  if (chartWithRent) {
    const left = { label: t('compare.withRent'), value: out.totalWealth };
    const right = { label: t('compare.savings'), value: outSavingsOnly.totalWealth };
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
  const wealthWithoutRent = out.savingTotal + out.equity;
  const chartWithoutRent = document.querySelector('#chartWithoutRent');
  if (chartWithoutRent) {
    const left = { label: t('compare.withoutRent'), value: wealthWithoutRent };
    const right = { label: t('compare.savings'), value: outSavingsOnly.totalWealth };
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
  const summaryEl = document.querySelector('#scenarioComparison');
  if (summaryEl) {
    const diff = out.totalWealth - outSavingsOnly.totalWealth;
    const percentDiff = ((diff / outSavingsOnly.totalWealth) * 100).toFixed(1);
    let message = '';
    if (diff > 0) message = t('comparison.realEstateBetter', { diff: fmt(diff), percent: percentDiff });
    else if (diff < 0) message = t('comparison.savingBetter', { diff: fmt(Math.abs(diff)), percent: Math.abs(percentDiff) });
    else message = t('comparison.equal');
    summaryEl.innerHTML = message;
  }
}

function render(){
  document.title = t('title');
  const out = computeMemoized(params);
  const outSavingsOnly = computeSavingsOnlyMemoized(params);
  setText('#subtitle', t('subtitleTemplate', { horizon: params.horizonYears, budget: fmt(params.monthlyBudget), saving: Number(params.saving.annualRatePct).toFixed(1), growth: Number(params.realEstate.annualGrowthPct).toFixed(2) }));
  setText('#kpiSetAside', fmt(out.setAside));
  setText('#kpiInvestable', fmt(out.investable));
  setText('#kpiDownPayment', fmt(out.downPayment));
  setText('#kpiPrincipal', fmt(out.principal));
  setText('#kpiPurchaseCosts', fmt(out.purchaseCost));
  setText('#kpiPurchaseCostsPct', (Number(params.realEstatePurchaseCostPct || 0) * 100).toFixed(1) + '%');
  setText('#kpiTotalPurchase', fmt(out.totalCost));
  setText('#kpiMonthlyBudget', fmt(out.budget));
  setText('#kpiLoanMonthly', fmt(out.loanMonthly));
    // Highlight if monthly payment exceeds budget
    const loanMonthlyEl = document.querySelector('#kpiLoanMonthly');
    const budget = out.budget || 0;
    if (loanMonthlyEl) {
      if (out.loanMonthly > budget && budget > 0) {
        loanMonthlyEl.classList.add('warn');
        loanMonthlyEl.setAttribute('title', t('warn.loanExceedsBudget'));
      } else {
        loanMonthlyEl.classList.remove('warn');
        loanMonthlyEl.removeAttribute('title');
      }
    }
  setText('#kpiExtraSaved', fmt(out.extraSavedFromBudget));
  setText('#kpiTotalMonthlySaving', fmt(out.totalMonthlySaving));
  
  const { cashflow, amort } = computeCashflowAndAmortizationMemoized(params);
  lastCashflow = cashflow;
  lastAmort = amort;
  const totalInterest = amort.reduce((sum, yr) => sum + yr.interest, 0);
  const monthlyInterest = totalInterest / (params.horizonYears * 12);
  setText('#kpiTotalInterest', fmt(totalInterest));
  setText('#kpiMonthlyInterest', fmt(monthlyInterest));
  
  // Calculate impact of +0.1% interest rate change
  const paramsHigherRate = deepClone(params);
  paramsHigherRate.loan.annualRatePct = (paramsHigherRate.loan.annualRatePct || 0) + 0.1;
  const { amort: amortHigherRate } = computeCashflowAndAmortizationMemoized(paramsHigherRate);
  const totalInterestHigherRate = amortHigherRate.reduce((sum, yr) => sum + yr.interest, 0);
  const interestDelta = totalInterestHigherRate - totalInterest;
  setText('#kpiInterestSensitivity', fmt(interestDelta));
  
  setText('#kpiSaving', fmt(out.savingTotal));
  setText('#kpiRE', fmt(out.reValue));
  setText('#kpiLoanBalance', fmt(out.loanBalance));
  setText('#kpiEquity', fmt(out.equity));
  setText('#kpiRentNetMonthly', fmt(out.rentNetMonthly));
  setText('#kpiRentProfit', fmt(out.rentProfit));
  setText('#kpiTotalWealth', fmt(out.totalWealth));
  renderChart([
    { label: t('chart.labels.savings'), value: out.savingTotal },
    { label: t('chart.labels.equity'), value: out.equity },
    { label: t('chart.labels.total'), value: out.totalWealth }
  ]);
  setText('#savingsOnlyTotal', fmt(outSavingsOnly.savingTotal));
  renderComparisonCharts(out, outSavingsOnly);
  renderTimelineChart(params);

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
    document.querySelectorAll('.amort-toggle-btn').forEach(btn => {
      btn.onclick = () => toggleAmortDetails(Number(btn.dataset.year), btn);
    });
    const toggleExpandBtn = document.querySelector('#toggleExpandAmort');
    if (toggleExpandBtn){
      toggleExpandBtn.onclick = ()=>{
        const pressed = toggleExpandBtn.getAttribute('aria-pressed') === 'true';
        if (!pressed){
          document.querySelectorAll('.amort-row').forEach(row => {
            const yr = Number(row.dataset.year);
            const btn = row.querySelector('.amort-toggle-btn');
            const detail = document.querySelector(`tr.amort-details[data-year="${yr}"]`);
            if (!detail && btn) toggleAmortDetails(yr, btn);
          });
          toggleExpandBtn.setAttribute('aria-pressed','true');
          toggleExpandBtn.textContent = t('amort.collapseAll');
        } else {
          document.querySelectorAll('tr.amort-details').forEach(d => d.remove());
          document.querySelectorAll('.amort-toggle-btn').forEach(b => { b.setAttribute('aria-expanded','false'); b.textContent='▶'; });
          toggleExpandBtn.setAttribute('aria-pressed','false');
          toggleExpandBtn.textContent = t('amort.expandAll');
        }
      };
      const pressed = toggleExpandBtn.getAttribute('aria-pressed') === 'true';
      toggleExpandBtn.textContent = pressed ? t('amort.collapseAll') : t('amort.expandAll');
    }
  }

  const monthlyYearSelect = document.querySelector('#monthlyYearSelect');
  const monthlyWrapper = document.querySelector('#monthlyCashflowWrapper');
  const horizon = Math.max(1, Number(params.horizonYears || 0));
  if (monthlyYearSelect){
    monthlyYearSelect.innerHTML = Array.from({length: horizon}, (_,i)=> `<option value="${i+1}">${i+1}</option>`).join('');
    const defaultYear = Math.min(3, horizon);
    if (!monthlyYearSelect.value) monthlyYearSelect.value = defaultYear;
    if (monthlyWrapper) {
      monthlyWrapper.style.display = 'block';
      renderMonthlyTable(computeMonthlyBreakdownForYear(params, Number(monthlyYearSelect.value)));
      const heading = document.querySelector('#monthlyHeading');
      if (heading) heading.textContent = t('monthly.heading', { year: Number(monthlyYearSelect.value) });
    }
    monthlyYearSelect.onchange = (e)=>{
      const y = Number(e.target.value || 1);
      const months = computeMonthlyBreakdownForYear(params, y);
      renderMonthlyTable(months);
      const heading = document.querySelector('#monthlyHeading');
      if (heading) heading.textContent = t('monthly.heading', { year: y });
    };
    const exportMonthlyBtn = document.querySelector('#exportMonthlyCsv');
    if (exportMonthlyBtn){
      exportMonthlyBtn.setAttribute('aria-label', t('monthly.exportCsvLabel') || 'Export monthly breakdown as CSV');
      exportMonthlyBtn.onclick = ()=>{
        const y = Number(monthlyYearSelect?.value || 1);
        const months = computeMonthlyBreakdownForYear(params, y);
        const rows = [[
          t('table.month'),
          t('monthly.grossRent'),
          t('monthly.netRent'),
          t('monthly.loanPayment'),
          t('monthly.netCash')
        ]];
        months.forEach(m => rows.push([m.month, m.grossMonthly.toFixed(2), m.netRent.toFixed(2), m.loanPayment.toFixed(2), m.netCash.toFixed(2)]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `monthly-${y}-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      };
    }
  }

  const toggleMonthlyBtn = document.querySelector('#toggleMonthlyCashflow');
  if (toggleMonthlyBtn && monthlyWrapper){
    toggleMonthlyBtn.onclick = ()=>{
      monthlyWrapper.style.display = monthlyWrapper.style.display === 'none' ? 'block' : 'none';
      if (monthlyWrapper.style.display === 'block'){
        const y = Number(monthlyYearSelect?.value || Math.min(3, horizon));
        renderMonthlyTable(computeMonthlyBreakdownForYear(params, y));
      }
      toggleMonthlyBtn.setAttribute('aria-pressed', monthlyWrapper.style.display === 'block');
      toggleMonthlyBtn.setAttribute('aria-expanded', monthlyWrapper.style.display === 'block');
    };
    toggleMonthlyBtn.setAttribute('aria-controls', 'monthlyCashflowWrapper');
    toggleMonthlyBtn.setAttribute('aria-pressed', monthlyWrapper.style.display === 'block');
    toggleMonthlyBtn.setAttribute('aria-expanded', monthlyWrapper.style.display === 'block');
  }

  document.querySelectorAll('#chartWithRent .compare-card, #chartWithoutRent .compare-card').forEach(card=>{
    const label = card.querySelector('.compare-label')?.textContent || '';
    const val = card.querySelector('.compare-value')?.textContent || '';
    card.setAttribute('title', `${label}: ${val}`);
    card.style.cursor = 'help';
  });

  // Loan-to-income and feasibility KPIs
  const income = Number(params.income) || 0;
  const loanMonthly = out.loanMonthly || 0;
  // Loan as % of income
  let pctIncome = income > 0 ? (loanMonthly / income) * 100 : 0;
  setText('#kpiLoanPctIncome', income > 0 ? pctIncome.toFixed(1) + '%' : '-');
  // Max allowed loan payment (40% and 50%)
  let maxAllowed40 = income * 0.4;
  let maxAllowed50 = income * 0.5;
  setText('#kpiMaxAllowedLoan', income > 0 ? `${fmt(maxAllowed40)} (40%) / ${fmt(maxAllowed50)} (50%)` : '-');
  // Highlight if above 40% or 50%
  const pctIncomeEl = document.querySelector('#kpiLoanPctIncome');
  if (pctIncomeEl) {
    pctIncomeEl.classList.remove('warn');
    pctIncomeEl.removeAttribute('title');
    if (pctIncome > 50) {
      pctIncomeEl.classList.add('warn');
      pctIncomeEl.setAttribute('title', t('warn.loanAbove50'));
    } else if (pctIncome > 40) {
      pctIncomeEl.classList.add('warn');
      pctIncomeEl.setAttribute('title', t('warn.loanAbove40'));
    }
  }
  // Max loan possible (income and 80% of property)
  const propertyValue = Number(params.realEstate?.price) || 0;
  const maxLoan80 = propertyValue * 0.8;
  // Calculate max loan by income (using annuity formula, 40% cap)
  let maxLoanByIncome = 0;
  if (income > 0 && params.loan?.annualRatePct && params.loan?.years) {
    const r = (Number(params.loan.annualRatePct) || 0) / 100 / 12;
    const n = (Number(params.loan.years) || 0) * 12;
    if (r > 0 && n > 0) {
      maxLoanByIncome = maxAllowed40 * ((1 - Math.pow(1 + r, -n)) / r);
    }
  }
  const maxLoanPossible = Math.min(maxLoan80, maxLoanByIncome || maxLoan80);
  setText('#kpiMaxLoanPossible', (maxLoanPossible > 0) ? fmt(maxLoanPossible) : '-');
  // Feasibility checks
  const principal = out.principal || 0;
  const downPayment = out.downPayment || 0;
  const purchaseCost = out.purchaseCost || 0;
  const reasons = [];
  if (principal > maxLoan80 + 1) {
    reasons.push(t('warn.above80', { needed: fmt(principal - maxLoan80) }));
  }
  if (maxLoanByIncome > 0 && principal > maxLoanByIncome + 1) {
    reasons.push(t('warn.notEnoughIncome', { max: fmt(maxAllowed40), pay: fmt(loanMonthly) }));
  }
  if (downPayment < purchaseCost - 1) {
    reasons.push(t('warn.costsNotCovered'));
  }
  const feasWarnEl = document.querySelector('#kpiFeasibilityWarn');
  if (feasWarnEl) {
    if (reasons.length){
      feasWarnEl.style.display = '';
      const inner = feasWarnEl.querySelector('.muted');
      if (inner) inner.textContent = reasons.join(' ');
      else feasWarnEl.textContent = reasons.join(' ');
      feasWarnEl.classList.add('warn');
    } else {
      feasWarnEl.style.display = 'none';
      feasWarnEl.classList.remove('warn');
    }
  }
}

function toggleAmortDetails(year, btn){
  const existing = document.querySelector(`tr.amort-details[data-year="${year}"]`);
  if (existing){
    existing.remove();
    btn.setAttribute('aria-expanded','false');
    btn.textContent = '▶';
    return;
  }
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
    `).join('') : `<tr><td colspan="6" style="text-align:center; padding:8px 0; color:var(--muted);">${t('amort.loanFullyPaid')}</td></tr>`;
  const detailHtml = `
    <tr class="amort-details" data-year="${year}">
      <td colspan="6">
        <div style="overflow:auto;">
          <table class="nested-table" aria-label="Monthly amortisation">
            <thead><tr><th>${t('table.month')}</th><th>${t('amort.startBalance')}</th><th>${t('amort.interest')}</th><th>${t('amort.principal')}</th><th>${t('amort.payment')}</th><th>${t('amort.endBalance')}</th></tr></thead>
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

function copyLink(){
  const url = getShareUrl();
  navigator.clipboard?.writeText(url).then(()=>{
    setText('#copyStatus', t('copy.linkCopied'));
    setTimeout(()=> setText('#copyStatus',''), 2500);
  }).catch(()=>{ alert(t('copy.copyFailed') + '\n' + url); });
}

function exportCSV(){
  const out = computeMemoized(params);
  const timeline = computeYearByYearMemoized(params);
  const rows = [];
  rows.push(['Key','Value']);
  rows.push([t('csv.horizon'), params.horizonYears]);
  rows.push([t('csv.monthlyBudget'), params.monthlyBudget]);
  rows.push([t('csv.cashNow'), fmt(params.cash.now)]);
  rows.push([t('csv.realEstatePrice'), fmt(params.realEstate.price)]);
  rows.push([t('csv.purchaseCostPct'), (Number(params.realEstatePurchaseCostPct||0)*100).toFixed(1) + '%']);
  rows.push([t('csv.purchaseCost'), fmt(out.purchaseCost)]);
  rows.push([t('csv.totalPurchase'), fmt(out.totalCost)]);
  rows.push([t('csv.totalWealth'), fmt(out.totalWealth)]);
  rows.push([t('csv.totalWealthSavings'), fmt(computeSavingsOnly(params).totalWealth)]);
  rows.push([]);
  rows.push([t('table.year'), t('table.realEstateWithRent'), t('table.realEstateWithoutRent'), t('table.savingsOnly')]);
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
  syncInputsFromParams();
  render();
}

function exportCashflowCsv(){
  const rows = [[t('table.year'), t('cashflow.grossRent'), t('cashflow.netRent'), t('cashflow.loanYear'), t('cashflow.netCash')]];
  lastCashflow.forEach(r => rows.push([r.year, r.grossAnnual.toFixed(2), r.netRent.toFixed(2), r.loanPaymentThisYear.toFixed(2), r.netCash.toFixed(2)]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `cashflow-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function exportAmortCsv(){
  const rows = [[t('table.year'), t('amort.startBalance'), t('amort.paid'), t('amort.interest'), t('amort.principal'), t('amort.endBalance')]];
  lastAmort.forEach(r => rows.push([r.year, r.startBalance.toFixed(2), r.paid.toFixed(2), r.interest.toFixed(2), r.principal.toFixed(2), r.endBalance.toFixed(2)]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `amortisation-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function downloadTimelineCsv(){
  const timeline = computeYearByYearMemoized(params);
  const rows = [[t('table.year'), t('table.realEstateWithRent'), t('table.realEstateWithoutRent'), t('table.savingsOnly')]];
  timeline.forEach(r => rows.push([r.year, r.wealthWithRent, r.wealthWithoutRent, r.savingsOnly]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `timeline-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function toggleTimelineTable(){
  const el = document.querySelector('#timelineTableWrapper');
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function init(){
  initLanguageSelector();
  applyTranslations();
  // Set render callback for handlers module
  setRenderCallback(render);
  bindInputs();
  applyParamsFromHash();
  syncInputsFromParams();
  // Language buttons handled in initLanguageSelector; re-render after setLang via applyTranslations.
  document.querySelector('#resetBtn')?.addEventListener('click', reset);
  document.querySelector('#copyLinkBtn')?.addEventListener('click', copyLink);
  document.querySelector('#exportCsvBtn')?.addEventListener('click', exportCSV);
  document.querySelector('#exportCashflowCsv')?.addEventListener('click', exportCashflowCsv);
  document.querySelector('#exportAmortCsv')?.addEventListener('click', exportAmortCsv);
  document.querySelector('#downloadTimelineCsv')?.addEventListener('click', downloadTimelineCsv);
  document.querySelector('#toggleTimelineTable')?.addEventListener('click', toggleTimelineTable);
  document.querySelector('#showBreakEven')?.addEventListener('change', ()=> renderTimelineChart(params));
  
  // Rate adjustment spinner controls
  const rateInput = document.querySelector('#rateAdjustmentInput');
  const rateMinus = document.querySelector('#rateAdjustmentMinus');
  const ratePlus = document.querySelector('#rateAdjustmentPlus');
  
  const updateRateAdjustmentImpact = () => {
    const adjustment = parseFloat(rateInput?.value || 0);
    const clamped = Math.max(-2, Math.min(2, adjustment));
    if (rateInput) rateInput.value = clamped.toFixed(2);
    
    const { amort: currentAmort } = computeCashflowAndAmortizationMemoized(params);
    const currentInterest = currentAmort.reduce((sum, yr) => sum + yr.interest, 0);
    
    const paramsAdjusted = deepClone(params);
    paramsAdjusted.loan.annualRatePct = (paramsAdjusted.loan.annualRatePct || 0) + clamped;
    const { amort: adjustedAmort } = computeCashflowAndAmortizationMemoized(paramsAdjusted);
    const adjustedInterest = adjustedAmort.reduce((sum, yr) => sum + yr.interest, 0);
    
    const impactDelta = adjustedInterest - currentInterest;
    const monthlyImpactDelta = impactDelta / (params.horizonYears * 12);
    
    const impactEl = document.querySelector('#kpiRateAdjustmentImpact');
    if (impactEl){
      impactEl.textContent = fmt(impactDelta);
      impactEl.style.color = impactDelta < 0 ? '#4ade80' : '#f97316';
    }
    
    const monthlyEl = document.querySelector('#kpiRateAdjustmentMonthly');
    if (!monthlyEl){
      const wrapper = document.querySelector('#kpiRateAdjustmentImpact')?.parentElement;
      if (wrapper){
        const monthlyDisplay = document.createElement('div');
        monthlyDisplay.id = 'kpiRateAdjustmentMonthly';
        monthlyDisplay.style.cssText = 'font-size:12px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,.06);';
        monthlyDisplay.innerHTML = '<div class="muted" style="font-size:11px; margin-bottom:4px;" data-i18n="kpi.monthlyRateImpact">Maandelijks gemiddelde</div><div class="kpiV" style="font-size:14px; color:inherit;"></div>';
        wrapper.appendChild(monthlyDisplay);
        applyTranslations();
      }
    }
    const monthlyDisplayValue = document.querySelector('#kpiRateAdjustmentMonthly .kpiV');
    if (monthlyDisplayValue){
      monthlyDisplayValue.textContent = fmt(monthlyImpactDelta);
      monthlyDisplayValue.parentElement.style.color = monthlyImpactDelta < 0 ? '#4ade80' : '#f97316';
    }
  };
  
  if (rateInput){
    rateInput.addEventListener('input', updateRateAdjustmentImpact);
    rateInput.addEventListener('change', updateRateAdjustmentImpact);
  }
  if (rateMinus){
    rateMinus.addEventListener('click', () => {
      if (rateInput) rateInput.value = (parseFloat(rateInput.value) - 0.01).toFixed(2);
      updateRateAdjustmentImpact();
    });
  }
  if (ratePlus){
    ratePlus.addEventListener('click', () => {
      if (rateInput) rateInput.value = (parseFloat(rateInput.value) + 0.01).toFixed(2);
      updateRateAdjustmentImpact();
    });
  }
  
  applyTranslations();
  render();
}

document.addEventListener('DOMContentLoaded', init);
