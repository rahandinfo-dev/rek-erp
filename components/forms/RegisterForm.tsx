"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { validatePassword } from "@/lib/validators/password";
import { getPasswordStrength } from "@/lib/utils/passwordStrength";
import PasswordInput from "@/components/forms/PasswordInput";
import { useT } from "@/components/i18n/LocaleProvider";

export default function RegisterForm() {
  const router = useRouter();
  const { t } = useT();

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const strength = getPasswordStrength(password);
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !companyName ||
      !fullName ||
      !username ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError(t("validation.fillAllFields"));
      return;
    }
    const validation = validatePassword(password);

    if (!validation.success) {
      setError(validation.message);
      return;
    }
    if (password !== confirmPassword) {
      setError(t("validation.passwordsMismatch"));
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          fullName,
          username,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setSuccess(t("auth.registerSuccess"));

      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      lang="ckb"
      className="relative min-h-screen min-h-dvh max-w-full overflow-x-clip overflow-y-auto bg-[#EEF2FF]"
    >
      <div className="absolute inset-0">
        <div className="absolute -top-60 -left-60 h-[650px] w-[650px] rounded-full bg-[#FFAE42]/15 blur-[170px]" />

        <div className="absolute -bottom-60 -right-60 h-[650px] w-[650px] rounded-full bg-cyan-400/20 blur-[170px]" />
      </div>

      <div className="relative z-10 flex min-h-screen min-h-dvh items-center justify-center p-4 sm:p-6 md:p-8">
        <div
          className="
      grid
      min-w-0
      overflow-hidden
      rounded-[28px]
      bg-white
      shadow-[0_30px_100px_rgba(0,0,0,.15)]
      sm:rounded-[36px]
      lg:grid-cols-2
      max-w-7xl
      w-full
      "
        >
          <section
            className="
  hidden
  lg:flex
  flex-col
  justify-between
  p-16
  bg-gradient-to-br
  from-[#FFAE42] via-[#E8942A] to-[#FFAE42]
  text-white
  "
          >
            <div>
              <div className="flex items-center gap-5">
                <Image
                  src="/logo.png"
                  alt={t("auth.brandName")}
                  width={180}
                  height={180}
                  priority
                  className="rounded-xl object-contain bg-transparent"
                />

                <div>
                  <h1 className="mt-6 text-4xl font-bold">
                    {t("auth.brandName")}
                  </h1>

                  <p className="mt-2 text-white/70">
                    {t("auth.heroSystem")} {t("auth.heroFactory")}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-5xl leading-[75px] font-black">
                {t("auth.heroTitleLine1")}
                <br />
                {t("auth.heroTitleLine2")}
                <br />
                {t("auth.heroTitleLine3")}
              </h2>

              <p className="mt-8 text-xl leading-10 text-[#FFF8EF]/90">
                {t("auth.heroBody")}
              </p>
            </div>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  ✓
                </div>

                <span>{t("auth.featureSpeed")}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  ✓
                </div>

                <span>{t("auth.featureSecurity")}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  ✓
                </div>

                <span>{t("auth.featureDesign")}</span>
              </div>
            </div>
          </section>
          <section className="flex items-center justify-center p-8 lg:p-16">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <h2 className="text-4xl font-black text-slate-900">
                  {t("auth.registerTitle")}
                </h2>

                <p className="mt-3 leading-8 text-gray-500">
                  {t("auth.registerHint")}
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <input
                  type="text"
                  placeholder={t("auth.companyName")}
                  autoComplete="organization"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-base outline-none transition-all focus:border-[#FFAE42] focus:ring-4 focus:ring-[#FFAE42]/15"
                />

                <input
                  type="text"
                  placeholder={t("auth.fullName")}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-base outline-none transition-all focus:border-[#FFAE42] focus:ring-4 focus:ring-[#FFAE42]/15"
                />

                <input
                  type="text"
                  placeholder={t("auth.username")}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-base outline-none transition-all focus:border-[#FFAE42] focus:ring-4 focus:ring-[#FFAE42]/15"
                />

                <input
                  type="email"
                  placeholder={t("auth.email")}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-base outline-none transition-all focus:border-[#FFAE42] focus:ring-4 focus:ring-[#FFAE42]/15"
                />

                <PasswordInput
                  placeholder={t("auth.password")}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-2xl border-slate-200 bg-white text-base focus:border-[#FFAE42] focus-visible:ring-[#FFAE42]/35"
                />
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
                <PasswordInput
                  placeholder={t("auth.confirmPassword")}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-14 w-full rounded-2xl border-slate-200 bg-white text-base focus:border-[#FFAE42] focus-visible:ring-[#FFAE42]/35"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 h-14 w-full rounded-2xl bg-gradient-to-r from-[#FFAE42] to-[#E8942A] text-lg font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-60"
                >
                  {loading
                    ? t("common.pleaseWait")
                    : t("auth.submitRegister")}
                </button>

                <div className="pt-3 text-center">
                  <span className="text-slate-500">{t("auth.haveAccount")}</span>

                  <Link
                    href="/login"
                    className="mr-2 font-bold text-[#FFAE42] hover:text-[#E8942A]"
                  >
                    {t("common.login")}
                  </Link>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
