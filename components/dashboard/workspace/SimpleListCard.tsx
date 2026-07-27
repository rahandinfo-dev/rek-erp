"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/LocaleProvider";

export default function SimpleListCard({
  title,
  empty,
  items,
  hrefAll,
}: {
  title: string;
  empty: string;
  hrefAll?: string;
  items: Array<{ id: string; title: string; subtitle?: string; href: string }>;
}) {
  const { t } = useT();
  return (
    <section className="rek-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        {hrefAll ? (
          <Link
            href={hrefAll}
            className="text-xs font-bold text-primary hover:underline"
          >
            {t("history.viewAll")}
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block px-5 py-3 transition hover:bg-muted/50"
              >
                <span className="block truncate text-sm font-bold">
                  {item.title}
                </span>
                {item.subtitle ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.subtitle}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
