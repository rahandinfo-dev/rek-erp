"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
const router = useRouter();

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
      setMessage("هەڵەیەک ڕوویدا.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-center mb-2">
          وشەی نهێنی لەبیرکردووە
        </h1>

        <p className="text-center text-gray-500 mb-6">
          ئیمەیڵەکەت بنووسە بۆ ناردنی لینکی گۆڕینی وشەی نهێنی.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3"
          />

          <button
            disabled={loading}
            className="w-full bg-[#FFAE42] hover:bg-[#E8942A] text-white rounded-lg p-3"
          >
            {loading ? "چاوەڕێبە..." : "ناردنی لینک"}
          </button>

        </form>

        {message && (
        <p
  className={`mt-5 text-center ${
    message.includes("نییە")
      ? "text-red-600"
      : "text-green-600"
  }`}
>
  {message}
</p>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-[#FFAE42] font-semibold"
          >
            گەڕانەوە بۆ چوونەژوورەوە
          </Link>
        </div>

      </div>
    </div>
  );
}