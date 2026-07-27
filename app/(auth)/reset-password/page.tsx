"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { validatePassword } from "@/lib/validators/password";
import { getPasswordStrength } from "@/lib/utils/passwordStrength";
import { passwordRequirements } from "@/lib/utils/passwordRequirements";
import { useT } from "@/components/i18n/LocaleProvider";

import {
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
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

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.newPassword")}
            className="w-full rounded-lg border p-3 pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
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
        <div className="relative mb-4">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder={t("auth.confirmPassword")}
            className="w-full rounded-lg border p-3 pr-12"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={
              showConfirmPassword
                ? t("auth.hidePassword")
                : t("auth.showPassword")
            }
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500 transition-colors hover:text-[#FFAE42]"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
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
