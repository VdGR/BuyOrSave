// ...existing code...
// i18n.js
const TRANSLATIONS = {
  nl: {
    title: "Interactieve koop-of-spaar planner",
    tagline: "Bereken koop vs. sparen.",
    resetBtn: "Reset (Excel defaults)",
    resetBtnTitle: "Reset alle waarden naar de Excel-standaard",
    copyLinkBtn: "Kopieer link",
    copyLinkBtnTitle: "Kopieer deelbare link",
    exportCsvBtn: "Exporteren (CSV)",
    exportCsvBtnTitle: "Exporteer scenario als CSV",
    inputsTitle: "Inputs",
    inputsSubtitle: "Wijzig → werkt meteen bij",
    "group.general": "Algemeen",
    "group.saving": "Spaargeld",
    "group.realEstate": "Vastgoed",
    "group.loan": "Lening",
    "group.rent": "Verhuur",
    "hint.budgetDistribution": "Dit budget wordt automatisch verdeeld: leningbetaling eerst, overschot gaat naar sparen.",
    "label.horizonYears": "Horizon (jaren)",
    "label.monthlyBudget": "Maandbudget (lening + sparen) (€ / maand)",
    "label.income": "Maandinkomen (€ / maand)",
    "label.cashNow": "Huidig spaargeld (€)",
    "label.setAsidePct": "% apart houden (0.15 = 15%)",
    "label.savingRate": "Rendement spaarrekening (% / jaar)",
    "label.realEstatePrice": "Aankoopprijs appartement (€)",
    "label.purchaseCostPct": "Aankoopkosten (% van prijs, 0.10 = 10%)",
    "label.realEstateGrowthPct": "Waardestijging vastgoed (% / jaar)",
    "label.loanRate": "Rente lening (% / jaar)",
    "label.loanYears": "Looptijd lening (jaren)",
    "label.rentEnabled": "Verhuur inschakelen",
    "label.enabled": "Ingeschakeld",
    "label.rentStartAfterYears": "Start verhuren na (jaren)",
    "label.rentMonthlyRent": "Huurprijs (€ / maand)",
    "label.rentVacancy": "Leegstand (0.25 = 25%)",
    "label.rentInsurance": "Brandverzekering (0.10 = 10%)",
    "label.rentTax": "Onroerende voorheffing (0.10 = 10%)",
    "label.rentMaintenance": "Onderhoud (0.20 = 20%)",
    resultsTitle: "Resultaten",
    subtitleTemplate: "{horizon} jaar • budget {budget}/m • sparen {saving}% • vastgoed {growth}%",
    "chart.labels.savings": "Sparen",
    "chart.labels.equity": "Equity",
    "chart.labels.total": "Totaal (sparen+equity+huur)",
    "compare.withRent": "Vastgoed (met huur)",
    "compare.withoutRent": "Vastgoed (geen huur)",
    "compare.savings": "Enkel sparen",
    "compare.title": "Scenario's vergelijken",
    "compare.subtitle": "Vastgoed vs. enkel sparen",
    "compare.scenario1Title": "Scenario 1: Enkel sparen",
    "compare.scenario1Subtitle": "Geen vastgoed, volledig budget → spaarrekening",
    "compare.whichBetter": "Welke is beter?",
    "chart.withRent": "📈 Met huurinkomsten",
    "chart.withoutRent": "📊 Zonder huurinkomsten (puur belegging)",
    "comparison.realEstateBetter": "✓ Vastgoed is beter<br/>+{diff} extra vermogen ({percent}% meer)",
    "comparison.savingBetter": "✗ Enkel sparen is beter<br/>+{diff} extra vermogen ({percent}% meer)",
    "comparison.equal": "= Gelijk<br/>Beide scenario's resulteren in hetzelfde vermogen",
    "breakeven.withRentBetterAfter": "Met huur: beter na ~{year} jaar",
    "breakeven.withRentNeverBetter": "Met huur: nooit beter (in deze periode)",
    "breakeven.withoutRentBetterAfter": "Zonder huur: beter na ~{year} jaar",
    "breakeven.withoutRentNeverBetter": "Zonder huur: nooit beter (in deze periode)",
    "unit.yearShort": "j",
    "timeline.showBreakEven": "Toon breakeven-markers",
    "timeline.toggleTable": "Toon jaartabel",
    "timeline.downloadCsv": "Download timeline (CSV)",
    "timeline.title": "Tijdslijn: Wanneer is vastgoed beter?",
    "timeline.subtitle": "Vermogen door de jaren heen",
    "table.year": "Jaar",
    "table.realEstateWithRent": "Vastgoed (met huur)",
    "table.realEstateWithoutRent": "Vastgoed (geen huur)",
    "table.savingsOnly": "Enkel sparen",
    "table.month": "Maand",
    "amort.expandAll": "Uitklappen alles",
    "amort.collapseAll": "Dichtklappen alles",
    "amort.loanFullyPaid": "Lening volledig afbetaald",
    "amort.title": "Amortisatie (jaarlijks)",
    "amort.exportCsv": "Export CSV",
    "amort.startBalance": "Startsaldo",
    "amort.paid": "Betaald (jr)",
    "amort.interest": "Rente (jr)",
    "amort.principal": "Kapitaal (jr)",
    "amort.endBalance": "Eindsaldo",
    "amort.payment": "Betaling",
    "monthly.heading": "Maandelijkse breakdown — Jaar {year}",
    "monthly.exportCsvLabel": "Exporteer maandelijkse breakdown als CSV",
    "monthly.grossRent": "Huur bruto",
    "monthly.netRent": "Netto huur",
    "monthly.loanPayment": "Lening (mnd)",
    "monthly.netCash": "Netto cashflow",
    "cashflow.title": "Cashflow & Amortisatie",
    "cashflow.subtitle": "Jaarlijkse samenvatting",
    "cashflow.titleShort": "Jaarlijkse cashflow",
    "cashflow.exportCsv": "Export CSV",
    "cashflow.grossRent": "Huur bruto",
    "cashflow.netRent": "Netto huur",
    "cashflow.loanYear": "Lening (jr)",
    "cashflow.netCash": "Netto cashflow",
    "copy.linkCopied": "Link gekopieerd",
    "copy.copyFailed": "Kopiëren mislukt — hier is de link",
    "csv.horizon": "Horizon (jaren)",
    "csv.monthlyBudget": "Maandbudget",
    "csv.cashNow": "Huidig spaargeld",
    "csv.realEstatePrice": "Aankoopprijs",
    "csv.purchaseCostPct": "Aankoopkosten (%)",
    "csv.purchaseCost": "Aankoopkosten (EUR)",
    "csv.totalPurchase": "Totale aankoop",
    "csv.totalWealth": "Totale vermogen (vastgoed)",
    "csv.totalWealthSavings": "Totale vermogen (enkel sparen)",
    "kpi.startCapital": "Startkapitaal",
    "kpi.setAside": "Apart gezet",
    "kpi.investable": "Investeerbaar (nu)",
    "kpi.realEstatePurchase": "Vastgoedaankoop",
    "kpi.downPayment": "Inbreng (auto)",
    "kpi.principal": "Leningbedrag (auto)",
    "kpi.purchaseCosts": "Aankoopkosten",
    "kpi.totalPurchase": "Totale aankoop",
    "kpi.budgetLoan": "Maandbudget & Lening",
    "kpi.monthlyBudget": "Maandbudget",
    "kpi.loanMonthly": "Lening afbetaling/maand",
    "kpi.loanPctIncome": "Leningbetaling / inkomen",
    "kpi.maxAllowedLoan": "Max. toegestane leningbetaling",
    "kpi.maxLoanPossible": "Max. lening mogelijk (80% v. prijs & inkomen)",
    "kpi.feasibilityWarn": "Let op: aankoop niet mogelijk met huidig inkomen/sparen!",
    "kpi.extraSaved": "Overschot → sparen/maand",
    "kpi.totalMonthlySaving": "Totaal sparen/maand",
    "kpi.afterHorizon": "Na horizon",
    "kpi.saving": "Sparen",
    "kpi.realEstateValue": "Vastgoedwaarde",
    "kpi.loanBalance": "Leningrest",
    "kpi.equity": "Netto equity",
    "kpi.rent": "Verhuur (na horizon)",
    "kpi.rentNetMonthly": "Netto verhuur/maand",
    "kpi.rentProfit": "Verhuur winst (horizon)",
    "kpi.totalInterest": "Totaal rente betaald",
    "kpi.monthlyInterest": "Gemiddeld/maand",
    "kpi.interestSensitivity": "Impact +0,1% rente",
    "kpi.interestImpact": "+{delta} meer rente",
    "kpi.rateAdjustment": "Rente aangepast",
    "kpi.rateAdjustmentLabel": "Verander rente (%)",
    "kpi.impactPreview": "Impact op totaal rente",
    "kpi.monthlyRateImpact": "Maandelijks gemiddelde",
    "warn.loanExceedsBudget": "Let op: maandelijkse leningbetaling is hoger dan het maandbudget!",
    "warn.loanAbove40": "Let op: leningbetaling is meer dan 40% van het inkomen!",
    "warn.loanAbove50": "Let op: leningbetaling is meer dan 50% van het inkomen!",
    "warn.notEnoughIncome": "Inkomen te laag: max maandlast {max}, huidige {pay}.",
    "warn.above80": "Max 80% kan geleend worden; extra inbreng nodig: {needed}.",
    "warn.costsNotCovered": "Aankoopkosten zijn niet gedekt door spaargeld.",
    "kpi.totalWealthHeading": "💎 TOTAAL VERMOGEN",
    "kpi.totalBreakdown": "Sparen + Equity + Huurwinst"
  },
  en: {
    title: "Buy or Save? Interactive planner",
    tagline: "Plan buy vs. save.",
    resetBtn: "Reset (Excel defaults)",
    resetBtnTitle: "Reset all values to Excel defaults",
    copyLinkBtn: "Copy link",
    copyLinkBtnTitle: "Copy shareable link",
    exportCsvBtn: "Export (CSV)",
    exportCsvBtnTitle: "Export scenario as CSV",
    inputsTitle: "Inputs",
    inputsSubtitle: "Change → updates instantly",
    "group.general": "General",
    "group.saving": "Savings",
    "group.realEstate": "Real estate",
    "group.loan": "Loan",
    "group.rent": "Rent",
    "hint.budgetDistribution": "This budget is automatically split: loan payments first, surplus goes to saving.",
    "label.horizonYears": "Horizon (years)",
    "label.monthlyBudget": "Monthly budget (loan + savings) (€ / month)",
    "label.income": "Monthly income (€ / month)",
    "label.cashNow": "Current savings (€)",
    "label.setAsidePct": "% set aside (0.15 = 15%)",
    "label.savingRate": "Savings interest (% / year)",
    "label.realEstatePrice": "Purchase price apartment (€)",
    "label.purchaseCostPct": "Purchase costs (% of price, 0.10 = 10%)",
    "label.realEstateGrowthPct": "Real estate growth (% / year)",
    "label.loanRate": "Loan interest (% / year)",
    "label.loanYears": "Loan term (years)",
    "label.rentEnabled": "Enable renting",
    "label.enabled": "Enabled",
    "label.rentStartAfterYears": "Start renting after (years)",
    "label.rentMonthlyRent": "Rent price (€ / month)",
    "label.rentVacancy": "Vacancy (0.25 = 25%)",
    "label.rentInsurance": "Insurance (0.10 = 10%)",
    "label.rentTax": "Property tax (0.10 = 10%)",
    "label.rentMaintenance": "Maintenance (0.20 = 20%)",
    resultsTitle: "Results",
    subtitleTemplate: "{horizon} yrs • budget {budget}/m • saving {saving}% • real estate {growth}%",
    "chart.labels.savings": "Savings",
    "chart.labels.equity": "Equity",
    "chart.labels.total": "Total (savings+equity+rent)",
    "compare.withRent": "Real estate (with rent)",
    "compare.withoutRent": "Real estate (no rent)",
    "compare.savings": "Savings only",
    "compare.title": "Compare scenarios",
    "compare.subtitle": "Real estate vs. savings only",
    "compare.scenario1Title": "Scenario 1: Savings only",
    "compare.scenario1Subtitle": "No real estate, full budget → savings",
    "compare.whichBetter": "Which is better?",
    "chart.withRent": "📈 With rent",
    "chart.withoutRent": "📊 Without rent (pure investment)",
    "comparison.realEstateBetter": "✓ Real estate is better<br/>+{diff} extra wealth ({percent}% more)",
    "comparison.savingBetter": "✗ Savings only is better<br/>+{diff} extra wealth ({percent}% more)",
    "comparison.equal": "= Equal<br/>Both scenarios result in the same wealth",
    "breakeven.withRentBetterAfter": "With rent: better after ~{year} years",
    "breakeven.withRentNeverBetter": "With rent: never better (in this period)",
    "breakeven.withoutRentBetterAfter": "Without rent: better after ~{year} years",
    "breakeven.withoutRentNeverBetter": "Without rent: never better (in this period)",
    "unit.yearShort": "y",
    "timeline.showBreakEven": "Show breakeven markers",
    "timeline.toggleTable": "Toggle year table",
    "timeline.downloadCsv": "Download timeline (CSV)",
    "timeline.title": "Timeline: When is real estate better?",
    "timeline.subtitle": "Wealth over the years",
    "table.year": "Year",
    "table.realEstateWithRent": "Real estate (with rent)",
    "table.realEstateWithoutRent": "Real estate (no rent)",
    "table.savingsOnly": "Savings only",
    "table.month": "Month",
    "amort.expandAll": "Expand all",
    "amort.collapseAll": "Collapse all",
    "amort.loanFullyPaid": "Loan fully paid",
    "amort.title": "Amortisation (annual)",
    "amort.exportCsv": "Export CSV",
    "amort.startBalance": "StartBalance",
    "amort.paid": "Paid",
    "amort.interest": "Interest",
    "amort.principal": "Principal",
    "amort.endBalance": "EndBalance",
    "amort.payment": "Payment",
    "monthly.heading": "Monthly breakdown — Year {year}",
    "monthly.exportCsvLabel": "Export monthly breakdown as CSV",
    "monthly.grossRent": "Gross rent",
    "monthly.netRent": "Net rent",
    "monthly.loanPayment": "Loan (mo)",
    "monthly.netCash": "Net cashflow",
    "cashflow.title": "Cashflow & Amortisation",
    "cashflow.subtitle": "Annual summary",
    "cashflow.titleShort": "Annual cashflow",
    "cashflow.exportCsv": "Export CSV",
    "cashflow.grossRent": "Gross rent",
    "cashflow.netRent": "Net rent",
    "cashflow.loanYear": "Loan (yr)",
    "cashflow.netCash": "Net cashflow",
    "copy.linkCopied": "Link copied",
    "copy.copyFailed": "Copy failed — here’s the link",
    "csv.horizon": "Horizon (years)",
    "csv.monthlyBudget": "Monthly budget",
    "csv.cashNow": "Current savings",
    "csv.realEstatePrice": "Purchase price",
    "csv.purchaseCostPct": "Purchase costs (%)",
    "csv.purchaseCost": "Purchase costs (EUR)",
    "csv.totalPurchase": "Total purchase",
    "csv.totalWealth": "Total wealth (real estate)",
    "csv.totalWealthSavings": "Total wealth (savings only)",
    "kpi.startCapital": "Start capital",
    "kpi.setAside": "Set aside",
    "kpi.investable": "Investable (now)",
    "kpi.realEstatePurchase": "Real estate purchase",
    "kpi.downPayment": "Down payment (auto)",
    "kpi.principal": "Loan amount (auto)",
    "kpi.purchaseCosts": "Purchase costs",
    "kpi.totalPurchase": "Total purchase",
    "kpi.budgetLoan": "Monthly budget & loan",
    "kpi.monthlyBudget": "Monthly budget",
    "kpi.loanMonthly": "Loan payment / month",
    "kpi.loanPctIncome": "Loan payment / income",
    "kpi.maxAllowedLoan": "Max allowed loan payment",
    "kpi.maxLoanPossible": "Max loan possible (80% of price & income)",
    "kpi.feasibilityWarn": "Warning: purchase not possible with current income/savings!",
    "kpi.extraSaved": "Surplus → saving / month",
    "kpi.totalMonthlySaving": "Total saving / month",
    "kpi.afterHorizon": "After horizon",
    "kpi.saving": "Saving",
    "kpi.realEstateValue": "Real estate value",
    "kpi.loanBalance": "Loan balance",
    "kpi.equity": "Net equity",
    "kpi.rent": "Rent (after horizon)",
    "kpi.rentNetMonthly": "Net rent / month",
    "kpi.rentProfit": "Rent profit (horizon)",
    "kpi.totalInterest": "Total interest paid",
    "kpi.monthlyInterest": "Average/month",
    "kpi.interestSensitivity": "Impact of +0.1% rate",
    "kpi.interestImpact": "+{delta} more interest",
    "kpi.rateAdjustment": "Rate adjustment",
    "kpi.rateAdjustmentLabel": "Change rate (%)",
    "kpi.impactPreview": "Impact on total interest",
    "kpi.monthlyRateImpact": "Monthly average",
    "warn.loanExceedsBudget": "Warning: monthly loan payment exceeds your monthly budget!",
    "warn.loanAbove40": "Warning: loan payment is more than 40% of income!",
    "warn.loanAbove50": "Warning: loan payment is more than 50% of income!",
    "warn.notEnoughIncome": "Income too low: max monthly payment {max}, current {pay}.",
    "warn.above80": "Only 80% can be financed; extra down payment needed: {needed}.",
    "warn.costsNotCovered": "Closing costs are not covered by savings.",
    "kpi.totalWealthHeading": "💎 TOTAL WEALTH",
    "kpi.totalBreakdown": "Saving + Equity + Rent profit"
  }
};

// Default to English; remember last choice in localStorage.
let currentLang = localStorage.getItem('lang') || 'en';

function syncLangUI(){
  const select = document.querySelector('#langSelect');
  if (select) select.value = currentLang;
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    const lang = btn.getAttribute('data-lang-toggle');
    const active = lang === currentLang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active);
  });
}

export function getLang(){
  return currentLang;
}

export function getLocale(){
  return currentLang === 'en' ? 'en-US' : 'nl-BE';
}

export function t(key, vars){
  const dict = TRANSLATIONS[currentLang] || {};
  // Prefer flat-key lookup ("label.cashNow"), then fallback to dotted path.
  let s = dict[key];
  if (typeof s !== 'string'){
    const parts = key.split('.');
    s = parts.reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), dict);
  }
  if (typeof s !== 'string') return key;
  if (vars){
    Object.keys(vars).forEach(k => {
      s = s.replace(new RegExp('\\{'+k+'\\}','g'), vars[k]);
    });
  }
  return s;
}

export function setLang(lang){
  currentLang = lang === 'en' ? 'en' : 'nl';
  localStorage.setItem('lang', currentLang);
  applyTranslations();
}

export function applyTranslations(){
  if (typeof document === 'undefined') return;
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const v = t(key);
    if (v) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const v = t(key);
    if (v) el.setAttribute('title', v);
  });
  syncLangUI();
}

export function initLanguageSelector(){
  const sel = document.querySelector('#langSelect');
  if (sel){
    sel.value = currentLang;
    sel.onchange = (e)=> setLang(e.target.value || 'nl');
  }
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    const lang = btn.getAttribute('data-lang-toggle');
    btn.onclick = ()=> setLang(lang || 'nl');
  });
  syncLangUI();
}

export { TRANSLATIONS };
