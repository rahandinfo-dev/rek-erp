"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { t } = useT();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      setMessage(data.message);

      if (data.success) {
        router.push(
          `/verify-reset-otp?email=${encodeURIComponent(email)}`
        );
      }
    } catch {
      setMessage(t("common.error"));
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">
          {t("auth.forgotTitle")}
        </h1>

        <p className="mb-6 text-center text-gray-500">{t("auth.forgotHint")}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            required
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <button
            disabled={loading}
            className="w-full rounded-lg bg-[#FFAE42] p-3 text-white hover:bg-[#E8942A]"
          >
            {loading ? t("common.pleaseWait") : t("auth.sendLink")}
          </button>
        </form>

        {message && (
          <p
            className={`mt-5 text-center ${
              message.includes("نییە") ? "text-red-600" : "text-green-600"
            }`}
          >
            {message}
          </p>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="font-semibold text-[#FFAE42]">
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
