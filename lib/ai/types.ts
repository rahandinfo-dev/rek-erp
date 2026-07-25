export type AiIntentId =
  | "today_sales"
  | "low_stock"
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

export const AI_SUGGESTED_PROMPTS = [
  "Show today's sales",
  "Find low stock products",
  "Create a new invoice",
  "Search customer",
  "Show unpaid invoices",
  "Generate monthly report",
  "Compare this month with last month",
  "Sales analysis",
  "Inventory analysis",
  "Profit and loss summary",
  "Top customers",
  "Show smart recommendations",
];
