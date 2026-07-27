"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Loader2 } from "lucide-react";
import {
  CURRENCY_CATALOG,
  CURRENCY_CODES,
  type CurrencyCode,
} from "@/lib/currency/catalog";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function CurrencyManager({
  initialCurrency,
}: {
  initialCurrency: CurrencyCode;
}) {
  const router = useRouter();
  const { currency, setCurrency, formatMoney } = useCurrency();
  const [selected, setSelected] = useState<CurrencyCode>(initialCurrency);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: selected }),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "گۆڕینی دراو سەرکەوتوو نەبوو.");
        return;
      }
      setCurrency(selected);
      appToast.success(json.message || "دراو نوێکرایەوە.");
      router.refresh();
    } catch {
      appToast.error("هەڵەی تۆڕ — دووبارە هەوڵ بدەرەوە.");
    } finally {
      setBusy(false);
    }
  }

  const meta = CURRENCY_CATALOG[selected];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-black text-primary">
          <Banknote aria-hidden />
          دراو
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          دراوی سەرەکی کاروباری کۆمپانیاکەت هەڵبژێرە. دوای گۆڕین، هەموو
          داشبۆرد، فرۆشتن، کڕین، ڕاپۆرت، شیکاری و یاریدەدەری زیرەک بە هەمان
          دراو پیشان دەدرێن.
        </p>
      </header>

      <section className="rek-card space-y-4 p-5">
        <h2 className="text-sm font-black">دراوی ئێستا</h2>
        <p className="text-2xl font-black tabular-nums">
          {CURRENCY_CATALOG[currency].nameKu}{" "}
          <span className="text-base text-muted-foreground">
            ({CURRENCY_CATALOG[currency].symbol})
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          نموونە: {formatMoney(1250000)}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black">هەڵبژاردنی دراو</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CURRENCY_CODES.map((code) => {
            const item = CURRENCY_CATALOG[code];
            const active = selected === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelected(code)}
                className={cn(
                  "rek-card flex items-start gap-3 p-4 text-start transition hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/35",
                  active && "border-primary bg-primary/5"
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center bg-primary/10 text-lg font-black text-primary">
                  {item.symbol}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-black">{item.nameKu}</span>
                    {active ? (
                      <Check size={16} className="text-primary" aria-hidden />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.code} · نموونە {formatMoney(1000).replace(
                      CURRENCY_CATALOG[currency].symbol,
                      item.symbol
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || selected === currency}
          onClick={() => void save()}
          className="inline-flex h-11 items-center gap-2 bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : null}
          {busy ? "پاشەکەوت..." : `پاشەکەوتکردنی ${meta.nameKu}`}
        </button>
        <p className="text-xs text-muted-foreground">
          گۆڕینی دراو نرخی مێژوویی ناگۆڕێت — تەنها شێوازی پیشاندان نوێ دەبێتەوە.
        </p>
      </div>
    </div>
  );
}
