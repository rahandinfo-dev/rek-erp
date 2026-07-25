"use client";

import { Fragment, useCallback, useEffect, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import type { AuditLogRow } from "@/lib/audit/query";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_MODULE_LABELS,
  AUDIT_MODULES,
} from "@/lib/audit/modules";
import { appToast } from "@/lib/toast";
import { inputClassName } from "@/components/ui/FormPrimitives";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Props = {
  users: Array<{ id: string; fullName: string }>;
  initialItems: AuditLogRow[];
  initialPagination: Pagination;
};

const DEVICES = ["Desktop", "Mobile", "Tablet", "Other", "Unknown"];

function formatJson(value: unknown) {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AuditLogClient({
  users,
  initialItems,
  initialPagination,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [device, setDevice] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage = page) => {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "25",
      });
      if (q.trim()) params.set("q", q.trim());
      if (module) params.set("module", module);
      if (action) params.set("action", action);
      if (userId) params.set("userId", userId);
      if (device) params.set("device", device);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      try {
        const res = await fetch(`/api/audit-logs?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) {
          appToast.error(json.message || "بارکردن سەرنەکەوت.");
          return;
        }
        startTransition(() => {
          setItems(json.data.items);
          setPagination(json.data.pagination);
          setPage(json.data.pagination.page);
        });
      } catch {
        appToast.error("بارکردن سەرنەکەوت.");
      }
    },
    [page, q, module, action, userId, device, from, to]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(1);
    }, 280);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, module, action, userId, device, from, to]);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-secondary px-3 py-1 text-sm font-bold text-primary">
            <Shield size={16} />
            Audit Log
          </div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            تۆماری چاودێری
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Who · When · What · Old/New · IP · Device · Module — هەمیشەیی ·
            گەڕان · فلتەر
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(page)}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary"
        >
          <RefreshCw size={16} className={pending ? "animate-spin" : ""} />
          نوێکردنەوە
        </button>
      </div>

      <div className="rek-card space-y-3 p-4 sm:p-5">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="گەڕان: کەس، IP، مۆدیول، action، entity…"
            className={`${inputClassName} pr-10`}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className={inputClassName}
          >
            <option value="">هەموو مۆدیولەکان</option>
            {AUDIT_MODULES.map((m) => (
              <option key={m} value={m}>
                {AUDIT_MODULE_LABELS[m] || m} ({m})
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className={inputClassName}
          >
            <option value="">هەموو کردارەکان</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a] || a} ({a})
              </option>
            ))}
          </select>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className={inputClassName}
          >
            <option value="">هەموو بەکارهێنەران</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className={inputClassName}
          >
            <option value="">هەموو ئامێرەکان</option>
            {DEVICES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClassName}
            aria-label="لە بەروار"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClassName}
            aria-label="بۆ بەروار"
          />
        </div>
      </div>

      <div className="rek-table-shell">
        <div className="rek-table-wrap">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/70 text-right">
              <tr>
                <th className="px-3 py-3 font-bold">کات</th>
                <th className="px-3 py-3 font-bold">کێ</th>
                <th className="px-3 py-3 font-bold">مۆدیول</th>
                <th className="px-3 py-3 font-bold">کردار</th>
                <th className="px-3 py-3 font-bold">چی</th>
                <th className="px-3 py-3 font-bold">IP</th>
                <th className="px-3 py-3 font-bold">ئامێر</th>
                <th className="px-3 py-3 font-bold">وردەکاری</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-muted-foreground"
                  >
                    <History className="mx-auto mb-2 opacity-40" size={32} />
                    هیچ تۆمارێکی audit نییە
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const open = expanded === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-t border-border hover:bg-muted/40">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-semibold">{row.date}</span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {row.time}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {row.userName || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-lg bg-secondary px-2 py-0.5 text-xs font-bold text-primary">
                            {AUDIT_MODULE_LABELS[row.module] || row.module}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold">
                          {AUDIT_ACTION_LABELS[row.action] || row.action}
                        </td>
                        <td className="max-w-[240px] px-3 py-3">
                          <p className="truncate font-semibold">
                            {row.summary || "—"}
                          </p>
                          {row.entityType ? (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {row.entityType}
                              {row.entityId ? ` · ${row.entityId}` : ""}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">
                          {row.ipAddress || "—"}
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold">
                          {row.device || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((id) =>
                                id === row.id ? null : row.id
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1 text-xs font-bold text-primary"
                          >
                            {open ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                            Old / New
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="bg-muted/30">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-bold text-muted-foreground">
                                  Old Value
                                </p>
                                <pre className="max-h-56 overflow-auto rounded-2xl border border-border bg-card p-3 text-[11px] leading-relaxed">
                                  {formatJson(row.oldValue)}
                                </pre>
                              </div>
                              <div>
                                <p className="mb-1 text-xs font-bold text-muted-foreground">
                                  New Value
                                </p>
                                <pre className="max-h-56 overflow-auto rounded-2xl border border-border bg-card p-3 text-[11px] leading-relaxed">
                                  {formatJson(row.newValue)}
                                </pre>
                              </div>
                              {row.userAgent ? (
                                <div className="lg:col-span-2">
                                  <p className="mb-1 text-xs font-bold text-muted-foreground">
                                    User-Agent
                                  </p>
                                  <p className="break-all rounded-2xl border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
                                    {row.userAgent}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          کۆی گشتی: {pagination.total} · لاپەڕە {pagination.page} /{" "}
          {pagination.totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            پێشوو
          </button>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => void load(page + 1)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            داهاتوو
          </button>
        </div>
      </div>
    </div>
  );
}
