// Centralized default input values
export const DEFAULTS = {
  horizonYears: 25,
  monthlyBudget: 1000,
  income: 2300,
  cash: { now: 55250, setAsidePct: 0.15 },
  saving: { annualRatePct: 1.5 },
  realEstate: { price: 220000, annualGrowthPct: 3 },
  realEstatePurchaseCostPct: 0.08,
  loan: { annualRatePct: 4.0, years: 25 },
  rent: {
    enabled: true,
    startAfterYears: 2,
    monthlyRent: 800,
    vacancyRate: 0.25,
    insuranceRate: 0.10,
    taxRate: 0.10,
    maintenanceRate: 0.20
  }
};
