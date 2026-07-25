"use client";

import { isSensitiveField, type RecoveryPayload, type RecoverySummary } from "@/lib/recovery/types";
import { MODULE_LABELS } from "@/lib/recovery/types";

function fieldKey(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  return el.id || el.name || el.getAttribute("data-recovery-key") || "";
}

/** Capture lightweight DOM snapshot — skips passwords / tokens. */
export function captureDomSnapshot(pathname: string, search: string): {
  payload: RecoveryPayload;
  summary: RecoverySummary;
} {
  const main =
    document.getElementById("main-content") ||
    document.querySelector("main");
  const scrollY = main ? main.scrollTop : window.scrollY;
  const scrollX = main ? main.scrollLeft : window.scrollX;

  const active = document.activeElement;
  let activeElementId: string | null = null;
  let selectionStart: number | null = null;
  let selectionEnd: number | null = null;

  if (active instanceof HTMLElement) {
    activeElementId = active.id || active.getAttribute("name");
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
    ) {
      try {
        selectionStart = active.selectionStart;
        selectionEnd = active.selectionEnd;
      } catch {
        /* ignore */
      }
    }
  }

  const fields: RecoveryPayload["fields"] = {};
  const root = main || document.body;
  const controls = root.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input, textarea, select");

  let hasImage = false;
  let hasWarehouse = false;
  let hasCustomer = false;
  let hasSupplier = false;
  let hasEmployee = false;
  let itemCount = 0;
  const notes: string[] = [];

  controls.forEach((el) => {
    const key = fieldKey(el);
    if (!key || isSensitiveField(key) || isSensitiveField(el.type || "")) return;
    if (el instanceof HTMLInputElement) {
      if (
        el.type === "password" ||
        (el.type === "hidden" && /token|csrf/i.test(key))
      )
        return;
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.type === "radio" && !el.checked) return;
        fields[key] = el.checked;
      } else if (el.type === "file") {
        if (el.files && el.files.length > 0) {
          hasImage = true;
          fields[key] = el.files[0]?.name || "file";
        }
      } else {
        fields[key] = el.value;
      }
    } else {
      fields[key] = el.value;
    }

    const lk = key.toLowerCase();
    if (lk.includes("warehouse") || lk.includes("werehouse")) {
      if (String(fields[key])) hasWarehouse = true;
    }
    if (lk.includes("customer") && String(fields[key])) hasCustomer = true;
    if (lk.includes("supplier") && String(fields[key])) hasSupplier = true;
    if (lk.includes("employee") && String(fields[key])) hasEmployee = true;
    if (lk.includes("image") || lk.includes("photo") || lk.includes("logo")) {
      if (String(fields[key])) hasImage = true;
    }
    if (lk.includes("note") && String(fields[key]).trim()) {
      notes.push("Notes edited");
    }
  });

  // Line items heuristic
  itemCount = root.querySelectorAll(
    "[data-line-item], tr[data-product-id], .sale-line, .purchase-line"
  ).length;

  const expanded: string[] = [];
  const collapsed: string[] = [];
  root.querySelectorAll<HTMLElement>("[data-expanded], [aria-expanded]").forEach((el) => {
    const id = el.id || el.getAttribute("data-section") || "";
    if (!id) return;
    const open =
      el.getAttribute("data-expanded") === "true" ||
      el.getAttribute("aria-expanded") === "true";
    if (open) expanded.push(id);
    else collapsed.push(id);
  });

  let tab: string | null = null;
  const tabEl = root.querySelector<HTMLElement>(
    '[role="tab"][aria-selected="true"], [data-state="active"][data-tab]'
  );
  if (tabEl) {
    tab =
      tabEl.getAttribute("data-tab") ||
      tabEl.id ||
      tabEl.textContent?.trim() ||
      null;
  }

  const draftKeys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.includes(":")) {
        // Collect draft keys for this path hint — full merge happens in provider
      }
    }
  } catch {
    /* ignore */
  }

  const fieldsChanged = Object.keys(fields).filter((k) => {
    const v = fields[k];
    return v !== "" && v !== false && v != null;
  }).length;

  const moduleKeyHint = pathname;
  const moduleLabel =
    MODULE_LABELS[
      moduleKeyHint.includes("sales")
        ? "sales"
        : moduleKeyHint.includes("product")
          ? "products"
          : "general"
    ] || "Session";

  const payload: RecoveryPayload = {
    pathname,
    search,
    scrollY,
    scrollX,
    activeElementId,
    selectionStart,
    selectionEnd,
    fields,
    expanded,
    collapsed,
    tab,
    draftKeys,
    meta: {},
  };

  const summary: RecoverySummary = {
    moduleLabel,
    fieldsChanged,
    hasImage,
    hasWarehouse,
    hasCustomer,
    hasSupplier,
    hasEmployee,
    itemCount,
    notes: Array.from(new Set(notes)).slice(0, 6),
    draftStatus:
      fieldsChanged === 0 ? "empty" : fieldsChanged < 3 ? "partial" : "draft",
    estimatedMs: Math.min(2500, 200 + fieldsChanged * 40 + itemCount * 30),
  };

  return { payload, summary };
}

/** Apply restored payload onto the current DOM (best-effort). */
export function applyDomSnapshot(payload: RecoveryPayload) {
  const main =
    document.getElementById("main-content") ||
    document.querySelector("main");

  if (main) {
    main.scrollTop = payload.scrollY || 0;
    main.scrollLeft = payload.scrollX || 0;
  } else {
    window.scrollTo(payload.scrollX || 0, payload.scrollY || 0);
  }

  for (const [key, value] of Object.entries(payload.fields || {})) {
    if (isSensitiveField(key)) continue;
    const el =
      (document.getElementById(key) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null) ||
      (document.querySelector(`[name="${CSS.escape(key)}"]`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null);
    if (!el) continue;
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = Boolean(value);
      } else if (el.type !== "file" && el.type !== "password") {
        el.value = String(value ?? "");
      }
    } else {
      el.value = String(value ?? "");
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (payload.activeElementId) {
    const focusEl =
      document.getElementById(payload.activeElementId) ||
      document.querySelector(`[name="${CSS.escape(payload.activeElementId)}"]`);
    if (
      focusEl instanceof HTMLInputElement ||
      focusEl instanceof HTMLTextAreaElement
    ) {
      focusEl.focus();
      try {
        if (payload.selectionStart != null && payload.selectionEnd != null) {
          focusEl.setSelectionRange(
            payload.selectionStart,
            payload.selectionEnd
          );
        }
      } catch {
        /* ignore */
      }
    } else if (focusEl instanceof HTMLElement) {
      focusEl.focus();
    }
  }

  for (const id of payload.expanded || []) {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute("data-expanded", "true");
      el.setAttribute("aria-expanded", "true");
    }
  }
}
