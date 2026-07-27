"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { useT } from "@/components/i18n/LocaleProvider";

export default function VerifyResetOtpPage() {
  const router = useRouter();
  const { t } = useT();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerifyOTP() {
    try {
      setLoading(true);

      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        appToast.error(data.message);
        return;
      }

      appToast.success(data.message);

      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error(error);

      appToast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold text-[#FFAE42]">
          {t("auth.verifyOtp")}
        </h1>

        <p className="mt-3 text-center text-gray-600">{t("auth.verifyOtpHint")}</p>

        <div className="mt-6">
          <label className="mb-2 block font-medium">{t("auth.email")}</label>

          <input
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border p-3 outline-none focus:border-[#FFAE42]"
          />
        </div>

        <div className="mt-5">
          <label className="mb-2 block font-medium">{t("auth.otpShort")}</label>

          <input
            type="text"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full rounded-xl border p-3 text-center text-2xl tracking-[10px] outline-none focus:border-[#FFAE42]"
          />
        </div>

        <button
          disabled={loading}
          onClick={handleVerifyOTP}
          className="mt-6 w-full rounded-xl bg-[#FFAE42] py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("common.pleaseWait") : t("auth.verifyOtpSubmit")}
        </button>
      </div>
    </main>
  );
}
