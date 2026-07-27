import Link from "next/link";
import { formatMoney } from "@/lib/utils/format";
import type {
  DashboardRecentInvoice,
  DashboardRecentSale,
} from "@/lib/dashboard/home";

export function RecentSalesList({ items }: { items: DashboardRecentSale[] }) {
  return (
    <section className="rek-card flex flex-col p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-foreground">دوایین فرۆشتنەکان</h2>
        <Link
          href="/dashboard/sales"
          className="text-sm font-bold text-primary hover:underline"
        >
          بینینی هەموو →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          هێشتا فرۆشتنێک نییە.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/dashboard/sales/${item.id}`}
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">
                    {item.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.invoiceNo} · {item.timeAgo}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-black tabular-nums text-foreground">
                  {formatMoney(item.total)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecentInvoicesList({
  items,
}: {
  items: DashboardRecentInvoice[];
}) {
  return (
    <section className="rek-card flex flex-col p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-foreground">دوایین پسوولەکان</h2>
        <Link
          href="/dashboard/invoices"
          className="text-sm font-bold text-primary hover:underline"
        >
          بینینی هەموو →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          هێشتا پسوولەیەک نییە.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/dashboard/invoices/${item.id}`}
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">
                    {item.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.invoiceNo} · {item.timeAgo}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-black tabular-nums text-foreground">
                  {formatMoney(item.grandTotal)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
