"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { validatePassword } from "@/lib/validators/password";
import { getPasswordStrength } from "@/lib/utils/passwordStrength";
import { passwordRequirements } from "@/lib/utils/passwordRequirements";
import { useT } from "@/components/i18n/LocaleProvider";
import PasswordInput from "@/components/forms/PasswordInput";

import {
  CheckCircle,
  XCircle,
  ShieldCheck,
} from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useT();

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
      ? t("validation.strengthWeak")
      : strength.score <= 2
        ? t("validation.strengthMedium")
        : strength.score <= 3
          ? t("validation.strengthFair")
          : t("validation.strengthVeryStrong");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setMessage(t("validation.passwordsDoNotMatch"));
      return;
    }

    if (password.length < 8) {
      setMessage(t("validation.passwordTooShort"));
      return;
    }

    try {
      if (strength.score < 4) {
        setMessage(t("validation.passwordTooWeak"));
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
      setMessage(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-center text-3xl font-bold">
          {t("auth.resetPassword")}
        </h1>

        <div className="mb-4">
          <PasswordInput
            placeholder={t("auth.newPassword")}
            className="w-full rounded-lg border border-gray-300 bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#FFAE42]" />

              <span className="text-sm font-medium">
                {t("auth.passwordStrengthAlt")}
              </span>
            </div>

            <span className="text-sm font-bold">{strengthText}</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full transition-all duration-500 ${strengthColor}`}
              style={{
                width: strengthWidth,
              }}
            />
          </div>
        </div>

        <div className="mb-4 space-y-3 rounded-xl border bg-slate-50 p-4">
          {(
            [
              "minLength",
              "upperCase",
              "lowerCase",
              "number",
              "special",
            ] as const
          ).map((key) => {
            const req = requirements[key];
            return (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-300 ${
                  req.valid ? "bg-green-50" : "bg-red-50"
                }`}
              >
                {req.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span>{req.text}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-300 ${strength.color}`}
              style={{
                width: `${strength.score * 20}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-sm">
            <span>{t("auth.passwordStrength")}</span>

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
        <div className="mb-4">
          <PasswordInput
            placeholder={t("auth.confirmPassword")}
            className="w-full rounded-lg border border-gray-300 bg-white"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#FFAE42] py-3 text-white"
        >
          {loading ? t("common.pleaseWait") : t("auth.resetPassword")}
        </button>

        {message && (
          <p className="mt-4 text-center text-green-600">{message}</p>
        )}
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useT();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          {t("common.pleaseWait")}
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
