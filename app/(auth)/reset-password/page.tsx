"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { validatePassword } from "@/lib/validators/password";
import { getPasswordStrength } from "@/lib/utils/passwordStrength";
import { passwordRequirements } from "@/lib/utils/passwordRequirements";

import {
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import {
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import {
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";



import { Suspense } from "react";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const strength = getPasswordStrength(password);
  const strengthColor =
  strength.score <= 1
    ? "bg-red-500"
    : strength.score <= 3
    ? "bg-yellow-500"
    : "bg-green-500";

const strengthWidth =
  strength.score <= 1
    ? "25%"
    : strength.score <= 2
    ? "50%"
    : strength.score <= 3
    ? "75%"
    : "100%";

const strengthText =
  strength.score <= 1
    ? "لاواز"
    : strength.score <= 2
    ? "مامناوەند"
    : strength.score <= 3
    ? "باش"
    : "زۆر بەهێز";
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const requirements = passwordRequirements(password); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
const validation = validatePassword(password);

if (!validation.success) {
  setMessage(validation.message);
  return;
}
    if (password !== confirmPassword) {
      setMessage("وشەی نهێنی یەک ناگرێتەوە.");
      return;
    }

    if (password.length < 8) {
      setMessage("وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت.");
      return;
    }

    try {
        if (strength.score < 4) {
  setMessage("وشەی نهێنی دەبێت بەهێزتر بێت.");
  return;
}
      setLoading(true);

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      setMessage(data.message);

      if (data.success) {
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      setMessage("هەڵەیەک ڕوویدا.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-center mb-6">
          گۆڕینی وشەی نهێنی
        </h1>

       <div className="relative mb-4">

  <input
    type={showPassword ? "text" : "password"}
    placeholder="وشەی نهێنی نوێ"
    className="w-full border rounded-lg p-3 pr-12"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
  >
    {showPassword ? (
      <EyeSlashIcon className="h-5 w-5" />
    ) : (
      <EyeIcon className="h-5 w-5" />
    )}
  </button>

</div>
  
<div className="mt-3">

  <div className="flex items-center justify-between mb-2">

    <div className="flex items-center gap-2">

      <ShieldCheckIcon className="h-5 w-5 text-[#FFAE42]" />

      <span className="text-sm font-medium">
        بەهێزی وشەی نهێنی
      </span>

    </div>

    <span className="text-sm font-bold">
      {strengthText}
    </span>

  </div>

  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">

    <div
      className={`h-full transition-all duration-500 ${strengthColor}`}
      style={{
        width: strengthWidth,
      }}
    />

  </div>

</div>



<div className="mb-4 rounded-xl border bg-slate-50 p-4 space-y-3">

  <div
  className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-300 ${
    requirements.minLength.valid
      ? "bg-green-50"
      : "bg-red-50"
  }`}
>
    
    {requirements.minLength.valid ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    )}
    <span>{requirements.minLength.text}</span>
  </div>

  <div className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-300 ${
    requirements.upperCase.valid
      ? "bg-green-50"
      : "bg-red-50"
  }`}>
    {requirements.upperCase.valid ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    )}
    <span>{requirements.upperCase.text}</span>
  </div>

 <div
  className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-300 ${
    requirements.lowerCase.valid
      ? "bg-green-50"
      : "bg-red-50"
  }`}
>

    {requirements.lowerCase.valid ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    )}
    <span>{requirements.lowerCase.text}</span>
  </div>

 <div
  className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-300 ${
    requirements.number.valid
      ? "bg-green-50"
      : "bg-red-50"
  }`}
>
    {requirements.number.valid ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    )}
    <span>{requirements.number.text}</span>
  </div>

 <div
  className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-300 ${
    requirements.special.valid
      ? "bg-green-50"
      : "bg-red-50"
  }`}
>
    {requirements.special.valid ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    )}
    <span>{requirements.special.text}</span>
  </div>

</div>

<div className="mt-2">

  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">

    <div
      className={`h-full transition-all duration-300 ${strength.color}`}
      style={{
        width: `${strength.score * 20}%`,
      }}
    />

  </div>

  <div className="mt-2 flex justify-between text-sm">

    <span>
      هێزی وشەی نهێنی
    </span>

    <span
      className={
        strength.score <= 2
          ? "text-red-600"
          : strength.score <= 4
          ? "text-yellow-600"
          : "text-green-600"
      }
    >
      {strength.label}
    </span>

  </div>

</div>
    <div className="relative mb-4">

  <input
    type={showConfirmPassword ? "text" : "password"}
    placeholder="دووبارەکردنەوەی وشەی نهێنی"
    className="w-full border rounded-lg p-3 pr-12"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
  />

  <button
    type="button"
    onClick={() =>
      setShowConfirmPassword(!showConfirmPassword)
    }
    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#FFAE42] transition-colors"
  >
    {showConfirmPassword ? (
      <EyeSlashIcon className="h-5 w-5" />
    ) : (
      <EyeIcon className="h-5 w-5" />
    )}
  </button>

</div>


        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FFAE42] text-white rounded-lg py-3"
        >
          {loading ? "چاوەڕوانبە..." : "گۆڕینی وشەی نهێنی"}
        </button>

        {message && (
          <p className="mt-4 text-center text-green-600">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          چاوەڕێ بکە...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}