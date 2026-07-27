import type { AiIntentId } from "@/lib/ai/types";

/** تەنها پرسیارە پێشوەختەکان — بەکارهێنەر ناتوانێت دەق بنووسێت. */
export const AI_PREDEFINED_QUESTIONS = [
  {
    id: "month_net_profit" as const,
    label: "قازانجی سافی ئەم مانگە چەندە؟",
  },
  {
    id: "month_sales_total" as const,
    label: "کۆی فرۆشتنی ئەم مانگە چەندە؟",
  },
  {
    id: "month_expenses_total" as const,
    label: "کۆی خەرجییەکانی ئەم مانگە چەندە؟",
  },
  {
    id: "customer_debt" as const,
    label: "قەرزی کڕیاران چەندە؟",
  },
] satisfies ReadonlyArray<{ id: AiIntentId; label: string }>;

export type PredefinedAiIntent = (typeof AI_PREDEFINED_QUESTIONS)[number]["id"];

const ALLOWED = new Set<string>(
  AI_PREDEFINED_QUESTIONS.map((q) => q.id)
);

export function isPredefinedIntent(id: string): id is PredefinedAiIntent {
  return ALLOWED.has(id);
}
