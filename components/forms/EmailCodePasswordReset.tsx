"use client";

import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { passwordRequirements } from "@/lib/utils/passwordRequirements";
import { appToast } from "@/lib/toast";

type Step = "idle" | "sent" | "verified" | "done";

export default function EmailCodePasswordReset() {
  const [step, setStep] = useState<Step>("idle");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reqs = passwordRequirements(password);

  async function sendCode() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/settings-reset/send", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "ناردنی کۆد سەرکەوتوو نەبوو.");
        appToast.error(json.message || "ناردنی کۆد سەرکەوتوو نەبوو.");
        return;
      }
      setStep("sent");
      appToast.success(json.message || "کۆد نێردرا.");
    } catch {
      setError("هەڵەیەک ڕوویدا.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("کۆد دەبێت ٦ ژمارە بێت.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/settings-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "پشتڕاستکردنەوە سەرکەوتوو نەبوو.");
        return;
      }
      setStep("verified");
      appToast.success(json.message);
    } catch {
      setError("هەڵەیەک ڕوویدا.");
    } finally {
      setBusy(false);
    }
  }

  async function completeReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("وشەی نهێنی نوێ و دووپاتکردنەوە یەک ناگرنەوە.");
      return;
    }
    const allValid = Object.values(reqs).every((r) => r.valid);
    if (!allValid) {
      setError("وشەی نهێنی نوێ مەرجەکان جێبەجێ ناکات.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/settings-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "گۆڕینی وشەی نهێنی سەرکەوتوو نەبوو.");
        return;
      }
      setStep("done");
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      appToast.success(json.message);
    } catch {
      setError("هەڵەیەک ڕوویدا.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        وشەی نهێنی بە سەرکەوتوویی گۆڕدرا.
      </div>
    );
  }

  return (
    <div className="space-y-4 border border-border bg-muted/30 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h3 className="text-sm font-black">گۆڕینی وشەی نهێنی بە ئیمەیڵ</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            کرتە بکە بۆ ناردنی کۆد بۆ ئیمەیڵی تۆمارکراوی ئەم هەژمارە بۆ
            گۆڕینی وشەی نهێنی.
          </p>
        </div>
      </div>

      {error ? (
        <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {step === "idle" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void sendCode()}
          className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Mail size={16} aria-hidden />
          {busy ? "چاوەڕێ بکە…" : "ناردنی کۆدی پشتڕاستکردنەوە"}
        </button>
      ) : null}

      {step === "sent" ? (
        <form onSubmit={verifyCode} className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">کۆدی ٦ ژمارەیی</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="h-11 w-full border border-border px-3 outline-none focus:border-primary/50"
              autoComplete="one-time-code"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "چاوەڕێ بکە…" : "پشتڕاستکردنەوە"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendCode()}
              className="border border-border px-4 py-2.5 text-sm font-bold"
            >
              ناردنەوە
            </button>
          </div>
        </form>
      ) : null}

      {step === "verified" ? (
        <form onSubmit={completeReset} className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">وشەی نهێنی نوێ</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="h-11 w-full border border-border px-3 outline-none focus:border-primary/50"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">
              دووپاتکردنەوەی وشەی نهێنی
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="h-11 w-full border border-border px-3 outline-none focus:border-primary/50"
            />
          </label>
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {Object.values(reqs).map((r) => (
              <li
                key={r.text}
                className={r.valid ? "text-emerald-700" : "text-muted-foreground"}
              >
                {r.valid ? "✓" : "○"} {r.text}
              </li>
            ))}
          </ul>
          <button
            type="submit"
            disabled={busy}
            className="bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "چاوەڕێ بکە…" : "گۆڕینی وشەی نهێنی"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
