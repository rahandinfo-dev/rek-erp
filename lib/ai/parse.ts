import type { AiIntentId } from "@/lib/ai/types";

export type ParsedIntent = {
  intent: AiIntentId;
  query?: string;
  confidence: number;
};

type Rule = {
  intent: AiIntentId;
  patterns: RegExp[];
  extract?: (text: string) => string | undefined;
};

const RULES: Rule[] = [
  {
    intent: "today_sales",
    patterns: [
      /\btoday'?s?\s+sales?\b/i,
      /\bsales?\s+today\b/i,
      /فرۆشتنی?\s*ئەمڕۆ/,
      /\bshow\s+today\b/i,
    ],
  },
  {
    intent: "low_stock",
    patterns: [
      /\blow\s+stock\b/i,
      /\bout\s+of\s+stock\b/i,
      /کەمی?\s*کۆگا/,
      /\bfind\s+low\b/i,
      /\bstock\s+alerts?\b/i,
    ],
  },
  {
    intent: "create_invoice",
    patterns: [
      /\bcreate\s+(a\s+)?(new\s+)?invoice\b/i,
      /\bnew\s+invoice\b/i,
      /\bnew\s+sale\b/i,
      /پسوولەی?\s*نوێ/,
      /فرۆشتنی?\s*نوێ/,
    ],
  },
  {
    intent: "search_customer",
    patterns: [
      /\bsearch\s+customer\b/i,
      /\bfind\s+customer\b/i,
      /\bcustomer\s+\S+/i,
      /کڕیار/,
    ],
    extract: (text) => {
      const m =
        text.match(/\b(?:customer|کڕیار)\s+(.+)$/i) ||
        text.match(/\bsearch\s+customer\s+(.+)$/i) ||
        text.match(/\bfind\s+customer\s+(.+)$/i);
      return m?.[1]?.trim();
    },
  },
  {
    intent: "unpaid_invoices",
    patterns: [
      /\bunpaid\b/i,
      /\bcredit\s+(sales?|invoices?)\b/i,
      /\blate\s+payments?\b/i,
      /قەرزی?\s*کراو/,
    ],
  },
  {
    intent: "monthly_report",
    patterns: [
      /\bmonthly\s+report\b/i,
      /\bgenerate\s+(monthly\s+)?report\b/i,
      /ڕاپۆرتی?\s*مانگانە/,
      /\bthis\s+month'?s?\s+report\b/i,
    ],
  },
  {
    intent: "compare_months",
    patterns: [
      /\bcompare\b.*\bmonth\b/i,
      /\bthis\s+month\b.*\blast\s+month\b/i,
      /\blast\s+month\b.*\bthis\s+month\b/i,
      /بەراورد.*مانگ/,
    ],
  },
  {
    intent: "sales_analysis",
    patterns: [/\bsales?\s+analysis\b/i, /\banalyze\s+sales?\b/i, /شیکاری?\s*فرۆشتن/],
  },
  {
    intent: "purchase_analysis",
    patterns: [
      /\bpurchases?\s+analysis\b/i,
      /\banalyze\s+purchases?\b/i,
      /شیکاری?\s*کڕین/,
    ],
  },
  {
    intent: "inventory_analysis",
    patterns: [
      /\binventory\s+analysis\b/i,
      /\bstock\s+analysis\b/i,
      /شیکاری?\s*کۆگا/,
    ],
  },
  {
    intent: "profit_loss",
    patterns: [
      /\bprofit\b/i,
      /\bloss\b/i,
      /\bp\s*&\s*l\b/i,
      /قازانج/,
      /زەرەر/,
    ],
  },
  {
    intent: "customer_insights",
    patterns: [
      /\bcustomer\s+insights?\b/i,
      /\btop\s+customers?\b/i,
      /باشترین\s*کڕیار/,
    ],
  },
  {
    intent: "supplier_performance",
    patterns: [
      /\bsupplier\s+performance\b/i,
      /\btop\s+suppliers?\b/i,
      /دابینکەر/,
    ],
  },
  {
    intent: "employee_stats",
    patterns: [
      /\bemployee\s+stats?\b/i,
      /\bemployee\s+statistics\b/i,
      /کارمەند/,
    ],
  },
  {
    intent: "warehouse_performance",
    patterns: [
      /\bwarehouse\s+performance\b/i,
      /\bwarehouse\s+stats?\b/i,
      /کۆگاکان/,
    ],
  },
  {
    intent: "recommendations",
    patterns: [
      /\brecommend/i,
      /\bsuggest/i,
      /\bbest\s+selling\b/i,
      /\bslow\s+moving\b/i,
      /\brestock\b/i,
      /پێشنیار/,
    ],
  },
  {
    intent: "alerts",
    patterns: [/\balerts?\b/i, /\bwarnings?\b/i, /ئاگاداری/],
  },
  {
    intent: "help",
    patterns: [/\bhelp\b/i, /\bwhat\s+can\s+you\b/i, /\bcommands?\b/i, /یارمەتی/],
  },
];

/** Lightweight NL intent parser (rule-based, no external LLM). */
export function parseAiIntent(raw: string): ParsedIntent {
  const text = raw.trim();
  if (!text) return { intent: "help", confidence: 1 };

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return {
          intent: rule.intent,
          query: rule.extract?.(text),
          confidence: 0.9,
        };
      }
    }
  }

  // Generic search fallback when query looks like a name/sku
  if (text.length >= 2 && text.length <= 60 && !/[?]/.test(text)) {
    return { intent: "search_general", query: text, confidence: 0.55 };
  }

  return { intent: "unknown", confidence: 0.2 };
}
