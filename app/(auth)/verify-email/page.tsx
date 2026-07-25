"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { appToast } from "@/lib/toast";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  async function verifyEmail(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (!data.success) {
      appToast.error(data.message || "هەڵەیەک ڕوویدا.");
      return;
    }

    appToast.success(data.message || "ئیمەیڵ پشتڕاستکرایەوە.");
    window.location.href = "/login";
  }

  async function resendCode() {
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
      } else {
        appToast.success(data.message);
        setCountdown(60);
      }
    } catch {
      appToast.error("پەیوەندی بە سێرڤەر نەکرا.");
    } finally {
      setLoading(false);
    }
  }

  const ticking = countdown > 0;
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted px-4">
      <form
        onSubmit={verifyEmail}
        className="rek-card w-full max-w-md space-y-5 p-6 sm:p-8"
      >
        <h1 className="text-center text-2xl font-black text-primary">
          پشتڕاستکردنەوەی ئیمەیڵ
        </h1>

        <div>
          <label htmlFor="verify-email" className="mb-2 block text-sm font-bold">
            ئیمەیڵ
          </label>
          <input
            id="verify-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 w-full rounded-2xl border border-border px-4 outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="verify-otp" className="mb-2 block text-sm font-bold">
            کۆد
          </label>
          <input
            id="verify-otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            inputMode="numeric"
            className="h-11 w-full rounded-2xl border border-border px-4 outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          className="h-11 w-full rounded-2xl bg-primary font-bold text-primary-foreground"
        >
          پشتڕاستکردنەوە
        </button>

        <button
          type="button"
          disabled={loading || countdown > 0}
          onClick={() => void resendCode()}
          className="w-full text-sm font-bold text-primary disabled:opacity-50"
        >
          {countdown > 0
            ? `دووبارە ناردن (${countdown})`
            : loading
              ? "چاوەڕوان بە..."
              : "ناردنی کۆدی نوێ"}
        </button>
      </form>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
          چاوەڕێ بکە...
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
