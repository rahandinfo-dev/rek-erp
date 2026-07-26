import type { MetricPeriod } from "@/lib/ai/metrics";
import type { AiIntentId } from "@/lib/ai/types";

export type ParseContext = {
  lastIntent?: AiIntentId | null;
  lastPeriod?: MetricPeriod | null;
};

export type ParsedIntent = {
  intent: AiIntentId;
  query?: string;
  period?: MetricPeriod;
  confidence: number;
  fromFollowUp?: boolean;
};

type Rule = {
  intent: AiIntentId;
  patterns: RegExp[];
  period?: MetricPeriod;
  extract?: (text: string) => string | undefined;
};

function detectPeriod(text: string): MetricPeriod | undefined {
  if (/ئەمڕۆ|ئەمرۆ|today/i.test(text)) return "today";
  if (/ئەم\s*هەفت|ئەمھەفت|this\s*week/i.test(text)) return "week";
  if (/مانگی\s*پێشوو|last\s*month/i.test(text)) return "last_month";
  if (/ئەم\s*مانگ|ئەممانگ|this\s*month/i.test(text)) return "month";
  return undefined;
}

/** Follow-up only period / short confirmations. */
function isFollowUpPeriodOnly(text: string) {
  return /^(ئەم\s*مانگە?|ئەم\s*هەفتە|ئەمڕۆ|مانگی\s*پێشوو|هەمان|دیسان|ئەو\s*ش\??|ئەمەش\??)\s*[؟?]?$/i.test(
    text.trim()
  );
}

const FOLLOW_UP_INTENTS = new Set<AiIntentId>([
  "month_sales_total",
  "month_expenses_total",
  "month_net_profit",
  "today_sales",
  "top_selling_product",
  "least_selling_product",
  "week_transactions",
  "profit_loss",
  "sales_analysis",
  "purchase_analysis",
  "compare_months",
  "profit_mom_change",
]);

const RULES: Rule[] = [
  // --- Core ERP questions (priority) ---
  {
    intent: "month_net_profit",
    period: "month",
    patterns: [
      /قازانجی?\s*ساف/,
      /سافی?\s*قازانج/,
      /قازانجی?\s*ئەم\s*مانگ/,
      /\bnet\s+profit\b/i,
      /\bprofit\s+this\s+month\b/i,
    ],
  },
  {
    intent: "month_sales_total",
    period: "month",
    patterns: [
      /کۆی?\s*فرۆشتن.*ئەم\s*مانگ/,
      /فرۆشتنی?\s*ئەم\s*مانگ/,
      /داهاتی?\s*ئەم\s*مانگ/,
      /\bsales?\s+this\s+month\b/i,
      /\bmonthly\s+sales?\b/i,
    ],
  },
  {
    intent: "month_expenses_total",
    period: "month",
    patterns: [
      /کۆی?\s*خەرجی/,
      /خەرجیی?ەکان.*ئەم\s*مانگ/,
      /کڕین.*ئەم\s*مانگ/,
      /\bexpenses?\s+this\s+month\b/i,
      /\bpurchases?\s+this\s+month\b/i,
    ],
  },
  {
    intent: "customer_debt",
    patterns: [
      /قەرزی?\s*کڕیار/,
      /کڕیار.*قەرز/,
      /قەرزی?\s*فرۆشتن/,
      /\bcustomer\s+debt\b/i,
      /\breceivables?\b/i,
      /\bunpaid\s+customer/i,
    ],
  },
  {
    intent: "supplier_debt",
    patterns: [
      /قەرزی?\s*دابینکەر/,
      /دابینکەر.*قەرز/,
      /\bsupplier\s+debt\b/i,
      /\bpayables?\b/i,
    ],
  },
  {
    intent: "top_selling_product",
    patterns: [
      /زۆرترین\s*فرۆشت/,
      /باشترین\s*فرۆشت/,
      /کام\s*کاڵا.*زۆر/,
      /\bbest\s*sell/i,
      /\btop\s*sell/i,
      /\bmost\s+sold\b/i,
    ],
  },
  {
    intent: "least_selling_product",
    patterns: [
      /کەمترین\s*فرۆشت/,
      /خراپترین\s*فرۆشت/,
      /کام\s*کاڵا.*کەم.*فرۆشت/,
      /\bleast\s*sell/i,
      /\bslow\s*mov/i,
      /\bworst\s*sell/i,
    ],
  },
  {
    intent: "low_stock",
    patterns: [
      /نزیک.*تەواو/,
      /تەواوبوون/,
      /کەمی?\s*کۆگا/,
      /کۆگا\s*کەم/,
      /\blow\s+stock\b/i,
      /\bout\s+of\s+stock\b/i,
      /\bstock\s+alerts?\b/i,
    ],
  },
  {
    intent: "stock_units",
    patterns: [
      /چەند\s*کاڵا.*کۆگا/,
      /کاڵا\s*لە\s*کۆگا/,
      /کۆی?\s*کۆگا/,
      /یەکە.*کۆگا/,
      /\bstock\s+count\b/i,
      /\binventory\s+units?\b/i,
      /\bhow\s+many\s+.*stock\b/i,
    ],
  },
  {
    intent: "today_invoices",
    patterns: [
      /پسووڵەی?\s*ئەمڕۆ/,
      /پسوولەی?\s*ئەمڕۆ/,
      /چەند\s*پسوو?ڵە.*ئەمڕۆ/,
      /\binvoices?\s+today\b/i,
      /\btoday'?s?\s+invoices?\b/i,
    ],
  },
  {
    intent: "user_count",
    patterns: [
      /چەند\s*بەکارهێنەر/,
      /ژمارەی?\s*بەکارهێنەر/,
      /بەکارهێنەر\s*هەیە/,
      /\bhow\s+many\s+users?\b/i,
      /\buser\s+count\b/i,
    ],
  },
  {
    intent: "week_transactions",
    patterns: [
      /ئەم\s*هەفتە.*مامەڵ/,
      /مامەڵە.*ئەم\s*هەفت/,
      /چەند\s*مامەڵ/,
      /\bthis\s+week\b.*\btransaction/i,
      /\bweekly\s+transactions?\b/i,
    ],
  },
  {
    intent: "profit_mom_change",
    patterns: [
      /قازانج.*زیاد.*کەم/,
      /قازانج.*کەم.*زیاد/,
      /قازانج.*بەراورد/,
      /ئەم\s*مانگە\s*قازانج/,
      /\bprofit\b.*\b(up|down|increase|decrease|compar)/i,
      /\bmonth\s+over\s+month\b/i,
    ],
  },

  // --- Existing intents ---
  {
    intent: "today_sales",
    period: "today",
    patterns: [
      /فرۆشتنی?\s*ئەمڕۆ/,
      /\btoday'?s?\s+sales?\b/i,
      /\bsales?\s+today\b/i,
    ],
  },
  {
    intent: "create_invoice",
    patterns: [
      /پسوو?ڵەی?\s*نوێ/,
      /فرۆشتنی?\s*نوێ/,
      /\bcreate\s+(a\s+)?(new\s+)?invoice\b/i,
      /\bnew\s+(invoice|sale)\b/i,
    ],
  },
  {
    intent: "search_customer",
    patterns: [
      /گەڕان\s*بۆ\s*کڕیار/,
      /دۆزینەوەی?\s*کڕیار/,
      /\bsearch\s+customer\b/i,
      /\bfind\s+customer\b/i,
    ],
    extract: (text) => {
      const m =
        text.match(/(?:کڕیار|customer)\s+(.+)$/i) ||
        text.match(/(?:گەڕان\s*بۆ\s*کڕیار|search\s+customer|find\s+customer)\s+(.+)$/i);
      return m?.[1]?.trim();
    },
  },
  {
    intent: "unpaid_invoices",
    patterns: [
      /پسوو?ڵە\s*نەدراو/,
      /فرۆشتنی?\s*قەرز/,
      /\bunpaid\b/i,
      /\bcredit\s+(sales?|invoices?)\b/i,
    ],
  },
  {
    intent: "monthly_report",
    patterns: [
      /ڕاپۆرتی?\s*مانگانە/,
      /\bmonthly\s+report\b/i,
      /\bgenerate\s+(monthly\s+)?report\b/i,
    ],
  },
  {
    intent: "compare_months",
    patterns: [
      /بەراورد.*مانگ/,
      /\bcompare\b.*\bmonth\b/i,
      /\bthis\s+month\b.*\blast\s+month\b/i,
    ],
  },
  {
    intent: "sales_analysis",
    patterns: [/شیکاری?\s*فرۆشتن/, /\bsales?\s+analysis\b/i],
  },
  {
    intent: "purchase_analysis",
    patterns: [/شیکاری?\s*کڕین/, /\bpurchases?\s+analysis\b/i],
  },
  {
    intent: "inventory_analysis",
    patterns: [/شیکاری?\s*کۆگا/, /شیکاری?\s*ئینڤێنتۆری/, /\binventory\s+analysis\b/i],
  },
  {
    intent: "profit_loss",
    patterns: [/قازانج\s*و\s*زیان/, /\bprofit\s*(and|&)\s*loss\b/i, /\bp\s*&\s*l\b/i],
  },
  {
    intent: "customer_insights",
    patterns: [/باشترین\s*کڕیار/, /\btop\s+customers?\b/i, /تێڕوانینی?\s*کڕیار/],
  },
  {
    intent: "supplier_performance",
    patterns: [/باشترین\s*دابینکەر/, /\btop\s+suppliers?\b/i, /ئەدای?\s*دابینکەر/],
  },
  {
    intent: "employee_stats",
    patterns: [/کارمەند/, /\bemployee\s+stats?\b/i],
  },
  {
    intent: "warehouse_performance",
    patterns: [/ئەدای?\s*کۆگا/, /کۆگاکان/, /\bwarehouse\s+(performance|stats?)\b/i],
  },
  {
    intent: "recommendations",
    patterns: [/پێشنیار/, /\brecommend/i, /\bsuggest/i],
  },
  {
    intent: "alerts",
    patterns: [/ئاگاداری/, /\balerts?\b/i, /\bwarnings?\b/i],
  },
  {
    intent: "help",
    patterns: [/یارمەتی/, /چی\s*دەتوانی/, /\bhelp\b/i, /\bwhat\s+can\s+you\b/i],
  },
];

/** Rule-based intent parser — no LLM, no guessing beyond patterns. */
export function parseAiIntent(
  raw: string,
  context: ParseContext = {}
): ParsedIntent {
  const text = raw.trim();
  if (!text) return { intent: "help", confidence: 1 };

  const periodFromText = detectPeriod(text);

  // Conversational follow-up: short period-only phrases reuse last metric intent
  if (
    context.lastIntent &&
    FOLLOW_UP_INTENTS.has(context.lastIntent) &&
    isFollowUpPeriodOnly(text)
  ) {
    return {
      intent: context.lastIntent,
      period: periodFromText || context.lastPeriod || "month",
      confidence: 0.85,
      fromFollowUp: true,
    };
  }

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return {
          intent: rule.intent,
          query: rule.extract?.(text),
          period: periodFromText || rule.period,
          confidence: 0.92,
        };
      }
    }
  }

  // Generic search when it looks like a name/SKU (no question mark)
  if (text.length >= 2 && text.length <= 60 && !/[؟?]/.test(text)) {
    return { intent: "search_general", query: text, confidence: 0.55 };
  }

  return { intent: "unknown", confidence: 0.2 };
}
