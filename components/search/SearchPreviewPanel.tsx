"use client";
import { formatNumber } from "@/lib/utils/format";

import Image from "next/image";
import type { CommandItem } from "@/lib/command/types";
import { formatRelativeUpdated } from "@/lib/search/relativeTime";

export default function SearchPreviewPanel({ item }: { item: CommandItem | null }) {
  if (!item) {
    return (
      <div className="hidden w-[240px] shrink-0 border-s border-border p-4 text-xs text-muted-foreground lg:block">
        Hover a result for quick preview
      </div>
    );
  }

  const p = item.preview;
  const isCommand =
    item.section === "action" ||
    item.section === "navigate" ||
    item.section === "context" ||
    Boolean(item.actionId || item.category);
  return (
    <aside className="hidden w-[240px] shrink-0 overflow-y-auto border-s border-border p-4 lg:block">
      <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
        {item.category || item.module || item.type || "Preview"}
      </p>
      <h3 className="mt-1 text-sm font-black text-foreground">{item.title}</h3>
      {item.shortcut ? (
        <p className="mt-1 font-mono text-[11px] text-primary">{item.shortcut}</p>
      ) : null}
      {item.description ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      ) : null}
      {item.subtitle && !isCommand ? (
        <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
      ) : null}
      {item.subtitle && isCommand && !item.description ? (
        <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
      ) : null}
      {item.updatedAt ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatRelativeUpdated(item.updatedAt)}
        </p>
      ) : null}

      {p?.image ? (
        <div className="relative mt-3 aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={p.image}
            alt=""
            fill
            className="object-cover"
            sizes="220px"
            unoptimized
          />
        </div>
      ) : null}

      <dl className="mt-3 space-y-1.5 text-xs">
        {p?.stock != null ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Stock</dt>
            <dd className="font-bold">{p.stock}</dd>
          </div>
        ) : null}
        {p?.warehouse ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Warehouse</dt>
            <dd className="truncate font-bold">{p.warehouse}</dd>
          </div>
        ) : null}
        {p?.salePrice != null ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Selling</dt>
            <dd className="font-bold">{formatNumber(Number(p.salePrice))}</dd>
          </div>
        ) : null}
        {p?.purchaseCost != null ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Cost</dt>
            <dd className="font-bold">
              {formatNumber(Number(p.purchaseCost))}
            </dd>
          </div>
        ) : null}
        {p?.lastSale ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Last sale</dt>
            <dd className="font-bold">
              {formatRelativeUpdated(new Date(p.lastSale).getTime())}
            </dd>
          </div>
        ) : null}
        {p?.phone ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-bold">{p.phone}</dd>
          </div>
        ) : null}
        {p?.email ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-bold">{p.email}</dd>
          </div>
        ) : null}
        {p?.status ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-bold">{p.status}</dd>
          </div>
        ) : null}
        {p?.total != null ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-bold">
              {formatNumber(Number(p.total))} {p.currency || ""}
            </dd>
          </div>
        ) : null}
        {p?.extras?.map((ex) => (
          <div key={ex.label} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{ex.label}</dt>
            <dd className="truncate font-bold">{ex.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
