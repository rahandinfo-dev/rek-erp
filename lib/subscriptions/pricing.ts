export type SubscriptionPlanKey = "ONE_MONTH" | "THREE_MONTHS" | "ONE_YEAR" | "LIFETIME";

export type SubscriptionPlanPrice = {
  plan: SubscriptionPlanKey;
  usd: number;
  iqd: number;
  durationMonths: number | null;
  baseDays: number | null;
  bonusDays: number;
  totalDays: number | null;
};

/** Subscription checkout uses this deliberately fixed, centrally managed rate. */
export const SUBSCRIPTION_IQD_PER_USD = 1_380;
export const SUBSCRIPTION_USD_PER_100 = 100;
export const SUBSCRIPTION_IQD_PER_100_USD = 138_000;
export const SUBSCRIPTION_PLAN_DURATIONS: Record<SubscriptionPlanKey, { baseDays: number | null; bonusDays: number; totalDays: number | null; durationMonths: number | null }> = {
  ONE_MONTH: { baseDays: 30, bonusDays: 0, totalDays: 30, durationMonths: 1 },
  THREE_MONTHS: { baseDays: 90, bonusDays: 3, totalDays: 93, durationMonths: 3 },
  ONE_YEAR: { baseDays: 365, bonusDays: 7, totalDays: 372, durationMonths: 12 },
  LIFETIME: { baseDays: null, bonusDays: 0, totalDays: null, durationMonths: null },
};
const DEFAULT_USD_PRICES: Record<SubscriptionPlanKey, number> = {
  ONE_MONTH: 5.99,
  THREE_MONTHS: 16.99,
  ONE_YEAR: 59.99,
  LIFETIME: 249.99,
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** One server-side source for display prices and the configured USD → IQD rate. */
export function getSubscriptionPricing(): { exchangeRateIqdPerUsd: number; plans: SubscriptionPlanPrice[] } {
  const exchangeRateIqdPerUsd = SUBSCRIPTION_IQD_PER_USD;
  const usdByPlan: Record<SubscriptionPlanKey, number> = {
    ONE_MONTH: positiveNumber(process.env.SUBSCRIPTION_PLAN_ONE_MONTH_USD, DEFAULT_USD_PRICES.ONE_MONTH),
    THREE_MONTHS: positiveNumber(process.env.SUBSCRIPTION_PLAN_THREE_MONTHS_USD, DEFAULT_USD_PRICES.THREE_MONTHS),
    ONE_YEAR: positiveNumber(process.env.SUBSCRIPTION_PLAN_ONE_YEAR_USD, DEFAULT_USD_PRICES.ONE_YEAR),
    LIFETIME: positiveNumber(process.env.SUBSCRIPTION_PLAN_LIFETIME_USD, DEFAULT_USD_PRICES.LIFETIME),
  };
  return {
    exchangeRateIqdPerUsd,
    plans: (["ONE_MONTH", "THREE_MONTHS", "ONE_YEAR", "LIFETIME"] as const).map((plan) => ({
      plan,
      usd: usdByPlan[plan],
      iqd: calculateIqd(usdByPlan[plan], exchangeRateIqdPerUsd),
      ...SUBSCRIPTION_PLAN_DURATIONS[plan],
    })),
  };
}

export function calculateIqd(usd: number, exchangeRateIqdPerUsd = SUBSCRIPTION_IQD_PER_USD) {
  return Math.round(usd * exchangeRateIqdPerUsd * 10) / 10;
}
