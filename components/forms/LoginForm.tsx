"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  Mail,
  ShieldCheck,
  Zap,
  Database,
} from "lucide-react";
import { useT } from "@/components/i18n/LocaleProvider";
import PasswordInput from "@/components/forms/PasswordInput";

export default function LoginForm() {
  const router = useRouter();
  const { t } = useT();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!login || !password) {
      setError(t("validation.fillAllFields"));
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login,
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.message ||
            (res.status === 429
              ? t("validation.rateLimited")
              : t("common.error"))
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("validation.serverUnreachable"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      lang="ckb"
      className="relative min-h-screen min-h-dvh max-w-full overflow-x-clip overflow-y-auto bg-[#FFF8EF]"
    >
      <div className="absolute inset-0">
        <div className="absolute -top-52 -left-52 h-[500px] w-[500px] rounded-full bg-[#FFAE42]/15 blur-[170px]" />

        <div className="absolute -bottom-52 -right-52 h-[500px] w-[500px] rounded-full bg-[#FFF8EF]/40 blur-[170px]" />
      </div>

      <div className="relative z-10 flex min-h-screen min-h-dvh items-center justify-center p-4 sm:p-6 md:p-8">
        <div
          className="
          grid
          w-full
          max-w-7xl
          min-w-0
          overflow-hidden
          rounded-[28px]
          border
          border-gray-200
          bg-white
          shadow-[0_30px_90px_rgba(15,23,42,.12)]
          sm:rounded-[36px]
          lg:grid-cols-2
          "
        >
          <section
            className="
            hidden
            lg:flex
            flex-col
            justify-between
            p-16
            text-white
            bg-gradient-to-br
            from-[#FFAE42]
            via-[#E8942A]
            to-[#FFAE42]
            "
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#FFF8EF]/80 text-lg">
                    {t("auth.heroSystem")}
                  </p>

                  <p className="text-[#FFF8EF]/80 text-lg">
                    {t("auth.heroFactory")}
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <h2 className="text-5xl font-black leading-none">
                      {t("auth.brandName")}
                    </h2>

                    <h2 className="mt-2 text-3xl font-black leading-none tracking-[0.35em]">
                      REK
                    </h2>
                  </div>

                  <Image
                    src="/logo.png"
                    alt={t("auth.brandName")}
                    width={170}
                    height={170}
                    priority
                    className="rounded-3xl object-contain bg-[#FFF8EF]/10 p-2"
                  />
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-6xl font-black leading-[85px]">
                {t("auth.heroTitleLine1")}
                <br />
                {t("auth.heroTitleLine2")}
                <br />
                {t("auth.heroTitleLine3")}
              </h1>

              <p className="mt-8 text-2xl leading-[45px] text-[#FFF8EF]/90">
                {t("auth.heroBody")}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Zap size={22} />
                </div>

                <span className="text-lg">{t("auth.featureSpeed")}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <ShieldCheck size={22} />
                </div>

                <span className="text-lg">{t("auth.featureSecurity")}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Database size={22} />
                </div>

                <span className="text-lg">{t("auth.featureUnified")}</span>
              </div>
            </div>
          </section>

          <section className="flex min-w-0 items-center justify-center p-5 sm:p-8 md:p-10 lg:p-14">
            <div className="w-full max-w-md min-w-0">
              <div className="mb-8 text-center sm:mb-10">
                <h1 className="text-3xl font-black text-slate-800 sm:text-4xl md:text-5xl">
                  {t("auth.loginTitle")}
                </h1>

                <p className="mt-3 text-base text-slate-500 sm:mt-4 sm:text-lg">
                  {t("auth.loginHint")}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-red-600"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="mb-3 block font-semibold text-slate-700"
                  >
                    {t("auth.emailOrUsername")}
                  </label>

                  <div className="relative">
                    <Mail
                      size={22}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />

                    <input
                      id="login-identifier"
                      type="text"
                      autoComplete="username"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder={t("auth.emailOrUsername")}
                      aria-invalid={Boolean(error)}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 pl-14 outline-none transition focus:border-[#FFAE42] focus-visible:ring-[3px] focus-visible:ring-[#FFAE42]/35"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-3 block font-semibold text-slate-700"
                  >
                    {t("auth.password")}
                  </label>

                  <PasswordInput
                      id="login-password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="h-14 w-full rounded-2xl border-slate-200 bg-white text-base focus:border-[#FFAE42] focus-visible:ring-[#FFAE42]/35"
                    />
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href="/forgot-password"
                    className="text-[#FFAE42] hover:underline"
                  >
                    {t("auth.forgotLink")}
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#FFAE42] to-[#FFAE42] font-bold text-white transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {loading ? t("common.pleaseWait") : t("common.login")}
                </button>

                <p className="pt-4 text-center text-slate-500">
                  {t("auth.noAccount")}

                  <Link
                    href="/register"
                    className="mr-2 font-bold text-[#FFAE42]"
                  >
                    {t("auth.createAccount")}
                  </Link>
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
