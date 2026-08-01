import type { AiIntentId } from "@/lib/ai/types";
/** Selection-only assistant actions. No arbitrary text is accepted by the public endpoint. */
export const AI_PREDEFINED_QUESTIONS = [
  { id: "today_sales", label: "پوختەی فرۆشتنی ئەمڕۆ" },
  { id: "purchase_analysis", label: "پوختە و شیکاری کڕین" },
  { id: "low_stock", label: "بەرهەمە کەم‌کۆگاکان" },
  { id: "customer_debt", label: "قەرزی دواکەوتووی کڕیاران" },
  { id: "supplier_debt", label: "باڵانسی دابینکەران" },
  { id: "employee_stats", label: "یادخستنەوەی مووچەی کارمەندان" },
  { id: "top_selling_product", label: "زۆرترین بەرهەمی فرۆشراو" },
  { id: "least_selling_product", label: "بەرهەمە هێواش‌جوڵاوەکان" },
  { id: "month_expenses_total", label: "پوختەی خەرجی ئەم مانگە" },
  { id: "profit_loss", label: "دیمەنی خێرای قازانج و زیان" },
  { id: "warehouse_performance", label: "ئاگادارییەکانی کۆگا" },
  { id: "week_transactions", label: "چالاکییە نوێیەکان" },
  { id: "alerts", label: "ئاگادارییەکانی سیستەم" },
  { id: "recommendations", label: "کردارە پێشنیارکراوەکان" },
  { id: "month_sales_total", label: "کۆی فرۆشتنی ئەم مانگە" },
] as const satisfies ReadonlyArray<{ id: AiIntentId; label: string }>;
export type PredefinedAiIntent = (typeof AI_PREDEFINED_QUESTIONS)[number]["id"];
const ALLOWED = new Set<string>(AI_PREDEFINED_QUESTIONS.map((q) => q.id));
export function isPredefinedIntent(id: string): id is PredefinedAiIntent { return ALLOWED.has(id); }
