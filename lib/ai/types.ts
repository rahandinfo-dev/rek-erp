import type { MetricPeriod } from "@/lib/ai/metrics";

export type AiIntentId =
  | "today_sales"
  | "month_sales_total"
  | "month_expenses_total"
  | "month_net_profit"
  | "customer_debt"
  | "supplier_debt"
  | "top_selling_product"
  | "least_selling_product"
  | "low_stock"
  | "stock_units"
  | "today_invoices"
  | "user_count"
  | "week_transactions"
  | "profit_mom_change"
  | "create_invoice"
  | "search_customer"
  | "unpaid_invoices"
  | "monthly_report"
  | "compare_months"
  | "sales_analysis"
  | "purchase_analysis"
  | "inventory_analysis"
  | "profit_loss"
  | "customer_insights"
  | "supplier_performance"
  | "employee_stats"
  | "warehouse_performance"
  | "recommendations"
  | "alerts"
  | "search_general"
  | "help"
  | "unknown";

export type AiActionLink = {
  label: string;
  href: string;
};

export type AiChatResponse = {
  reply: string;
  intent: AiIntentId;
  links?: AiActionLink[];
  data?: Record<string, unknown>;
  suggestions?: string[];
  period?: MetricPeriod;
};

export type AiInsightView = {
  id: string;
  category: string;
  title: string;
  summary: string;
  severity: string;
  href: string | null;
  score: number | null;
  createdAt: string;
};

export type AiAlertView = {
  id: string;
  kind: string;
  title: string;
  message: string;
  severity: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  status: string;
  createdAt: string;
};

export type AiRecommendation = {
  id: string;
  kind: string;
  title: string;
  reason: string;
  href: string;
  priority: "low" | "normal" | "high";
};

export type BusinessHealth = {
  score: number;
  label: "Excellent" | "Good" | "Fair" | "At Risk" | "Critical";
  factors: Array<{ key: string; label: string; score: number; note: string }>;
};

export type AiDashboardBundle = {
  insights: AiInsightView[];
  alerts: AiAlertView[];
  recommendations: AiRecommendation[];
  health: BusinessHealth;
  generatedAt: string;
};

/** Suggested chips — Kurdish Sorani, real ERP questions only. */
export const AI_SUGGESTED_PROMPTS = [
  "قازانجی سافی ئەم مانگە چەندە؟",
  "کۆی فرۆشتنی ئەم مانگە چەندە؟",
  "کۆی خەرجییەکانی ئەم مانگا چەندە؟",
  "قەرزی کڕیاران چەندە؟",
  "قەرزی دابینکەران چەندە؟",
  "کام کاڵا زۆرترین فرۆشتراوە؟",
  "کام کاڵا کەمترین فرۆشتراوە؟",
  "کام کاڵا نزیکە لە تەواوبوون؟",
  "چەند کاڵا لە کۆگا ماوە؟",
  "چەند پسووڵەی ئەمڕۆ تۆمارکراون؟",
  "چەند بەکارهێنەر هەیە؟",
  "ئەم هەفتە چەند مامەڵە کراوە؟",
  "ئەم مانگە قازانج زیاد بووە یان کەم بووە؟",
];

export const AI_WELCOME_KU =
  "سڵاو — من یاریدەدەری ERPـی ڕێکم. تەنها لەسەر داتای ڕاستەقینەی کۆمپانیاکەت وەڵام دەدەمەوە. هیچ ژمارەیەک خەیاڵی یان خەملێنراو نییە. پرسیارێک بکە یان یەکێک لە پێشنیارەکان هەڵبژێرە.";
