"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  PUSH_CATEGORIES,
  PUSH_CATEGORY_LABELS,
  DEFAULT_PUSH_CATEGORIES,
  type PushCategoryMap,
} from "@/lib/pwa/categories";
import {
  getRegistration,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pwa/client";
import { cn } from "@/lib/utils";
import { appToast } from "@/lib/toast";
import { useT } from "@/components/i18n/LocaleProvider";
import { permissionLabelKu } from "@/components/pwa/NotificationPermissionPrompt";

type PrefsState = {
  enabled: boolean;
  categories: PushCategoryMap;
  deviceCount: number;
  options: { silent?: boolean };
};

export default function NotificationPrefsPanel({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useT();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<PrefsState>({
    enabled: false,
    categories: { ...DEFAULT_PUSH_CATEGORIES },
    deviceCount: 0,
    options: { silent: false },
  });
  const [permTick, setPermTick] = useState(0);
  const permission = useSyncExternalStore(
    () => () => {},
    () => {
      void permTick;
      return typeof Notification !== "undefined"
        ? Notification.permission
        : "default";
    },
    () => "default" as NotificationPermission
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pwa/prefs", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setPrefs({
          enabled: Boolean(json.data.enabled),
          categories: {
            ...DEFAULT_PUSH_CATEGORIES,
            ...(json.data.categories || {}),
          },
          deviceCount: Number(json.data.deviceCount || 0),
          options: json.data.options || { silent: false },
        });
      }
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/pwa/prefs", { cache: "no-store" });
        const json = await res.json();
        if (cancelled || !json.success || !json.data) return;
        setPrefs({
          enabled: Boolean(json.data.enabled),
          categories: {
            ...DEFAULT_PUSH_CATEGORIES,
            ...(json.data.categories || {}),
          },
          deviceCount: Number(json.data.deviceCount || 0),
          options: json.data.options || { silent: false },
        });
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(partial: {
    enabled?: boolean;
    categories?: PushCategoryMap;
    options?: { silent?: boolean };
  }) {
    setBusy(true);
    try {
      const res = await fetch("/api/pwa/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || t("pwa.saveFailed"));
        return;
      }
      setPrefs((prev) => ({
        ...prev,
        enabled: json.data.enabled,
        categories: {
          ...DEFAULT_PUSH_CATEGORIES,
          ...(json.data.categories || {}),
        },
        options: json.data.options || prev.options,
      }));
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    setBusy(true);
    try {
      const perm = await requestNotificationPermission();
      setPermTick((n) => n + 1);
      if (perm !== "granted") {
        appToast.error(t("pwa.permDenied"));
        return;
      }
      const reg = (await getRegistration()) || null;
      if (!reg) {
        appToast.error(t("pwa.swNotReady"));
        return;
      }
      const sub = await subscribeToPush(reg);
      if (!sub) {
        appToast.error(t("pwa.subscribeFailed"));
        return;
      }
      await save({ enabled: true });
      appToast.success(t("pwa.enabled"));
      await load();
    } catch (error) {
      console.error(error);
      appToast.error(t("pwa.enableFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      await save({ enabled: false });
      appToast.success(t("pwa.disabled"));
      await load();
    } catch {
      appToast.error(t("pwa.disableFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-card p-6 sm:p-8",
        className
      )}
      aria-labelledby="push-prefs-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="push-prefs-title"
            className="text-xl font-bold text-foreground"
          >
            {t("pwa.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            وەرگرتنی ئاگاداری لەسەر کۆمپیوتەر، ئەندرۆید و وێبگەڕ — تەنانەت کاتێک
            تاب داخراوە.
          </p>
        </div>
        {prefs.enabled ? (
          <Bell className="size-6 shrink-0 text-primary" aria-hidden />
        ) : (
          <BellOff
            className="size-6 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
      </div>

      <div className="mt-6 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 px-4 py-3">
          <span className="text-sm font-bold">{t("pwa.enable")}</span>
          <input
            type="checkbox"
            checked={prefs.enabled}
            disabled={!ready || busy}
            onChange={(e) => {
              if (e.target.checked) void enablePush();
              else void disablePush();
            }}
            className="size-4 accent-primary"
            aria-label={t("pwa.enableAria")}
          />
        </label>

        <div className="rounded-2xl border border-border px-4 py-3 text-xs text-muted-foreground">
          <p>
            {t("pwa.permission")}:{" "}
            <span className="font-bold text-foreground">
              {permissionLabelKu(permission)}
            </span>
            {" · "}
            {t("pwa.devices")}:{" "}
            <span className="font-bold text-foreground">
              {prefs.deviceCount}
            </span>
          </p>
          {busy ? (
            <p className="mt-2 inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> {t("pwa.saving")}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <p className="text-sm font-bold">{t("pwa.categories")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            هەڵبژێرە کام جۆری ئاگاداری دەتەوێت وەربگریت.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {PUSH_CATEGORIES.map((key) => (
              <li key={key}>
                <label className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-xs">
                  <span className="font-semibold text-foreground">
                    {PUSH_CATEGORY_LABELS[key].ku}
                  </span>
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    disabled={!ready || busy || !prefs.enabled}
                    checked={prefs.categories[key]}
                    onChange={(e) => {
                      const next = {
                        ...prefs.categories,
                        [key]: e.target.checked,
                      };
                      setPrefs((p) => ({ ...p, categories: next }));
                      void save({ categories: next });
                    }}
                    aria-label={PUSH_CATEGORY_LABELS[key].ku}
                  />
                </label>
              </li>
            ))}
          </ul>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 px-4 py-3">
          <div>
            <span className="text-sm font-bold">{t("pwa.silent")}</span>
            <p className="text-xs text-muted-foreground">{t("pwa.silentHint")}</p>
          </div>
          <input
            type="checkbox"
            checked={Boolean(prefs.options.silent)}
            disabled={!ready || busy || !prefs.enabled}
            onChange={(e) => {
              const options = { ...prefs.options, silent: e.target.checked };
              setPrefs((p) => ({ ...p, options }));
              void save({ options });
            }}
            className="size-4 accent-primary"
            aria-label={t("pwa.silentAria")}
          />
        </label>
      </div>
    </section>
  );
}
