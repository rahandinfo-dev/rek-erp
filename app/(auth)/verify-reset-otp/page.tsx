"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";

export default function VerifyResetOtpPage() {
  const router = useRouter();

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

    router.push(
      `/reset-password?email=${encodeURIComponent(email)}`
    );

  } catch (error) {
    console.error(error);

    appToast.error("هەڵەیەک ڕوویدا.");
  } finally {
    setLoading(false);
  }
}
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-center text-[#FFAE42]">
          پشتڕاستکردنەوەی کۆد
        </h1>

        <p className="mt-3 text-center text-gray-600">
          کۆدی ٦ ژمارەیی کە بۆ ئیمەیڵەکەت نێردراوە بنووسە.
        </p>

        <div className="mt-6">
          <label className="mb-2 block font-medium">
            ئیمەیڵ
          </label>

          <input
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border p-3 outline-none focus:border-[#FFAE42]"
          />
        </div>

        <div className="mt-5">
          <label className="mb-2 block font-medium">
            OTP
          </label>

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
          {loading ? "چاوەڕوانبە..." : "پشتڕاستکردنەوەی OTP"}
        </button>
      </div>
    </main>
  );
}
