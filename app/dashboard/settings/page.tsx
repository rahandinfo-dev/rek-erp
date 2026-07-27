import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import CompanySettingsForm from "@/components/forms/CompanySettingsForm";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import UserAvatarForm from "@/components/forms/UserAvatarForm";
import AutoSaveSettingsPanel from "@/components/unsaved/AutoSaveSettingsPanel";
import NotificationPrefsPanel from "@/components/pwa/NotificationPrefsPanel";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";
import { BookOpen, FileText, Hash, Plus } from "lucide-react";
import Image from "next/image";
import { tServer } from "@/lib/i18n";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const t = tServer.t;

  if (!user) {
    return null;
  }

  const settings = await db.settings.findUnique({
    where: { companyId: user.companyId },
  });

  const templatesCount = await db.invoiceTemplate.count({
    where: { companyId: user.companyId },
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#FFAE42] sm:text-4xl">
            {t("settings.companyProfile")}
          </h1>
          <p className="mt-2 text-slate-500">{t("settings.companySubtitle")}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/settings/docs"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FFAE42]/30 bg-gradient-to-br from-[#FFAE42]/10 to-white px-5 py-3 font-bold text-[#FFAE42] shadow-sm transition hover:border-[#FFAE42]/50 hover:shadow-md"
          >
            <BookOpen size={18} />
            {t("settings.systemDocs")}
          </Link>
          <Link
            href="/dashboard/settings/numbering"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FFAE42]/20 bg-white px-5 py-3 font-bold text-[#FFAE42] hover:bg-[#FFAE42]/5"
          >
            <Hash size={18} />
            {t("settings.autoNumbering")}
          </Link>
          <Link
            href="/dashboard/settings/templates"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FFAE42]/20 bg-white px-5 py-3 font-bold text-[#FFAE42] hover:bg-[#FFAE42]/5"
          >
            <FileText size={18} />
            {t("settings.templatesCount", { count: templatesCount })}
          </Link>
        </div>
      </div>

      <Link
        href="/dashboard/settings/docs"
        className="group block overflow-hidden rounded-3xl border border-[#FFAE42]/25 bg-gradient-to-br from-[#FFAE42]/8 via-white to-amber-50/40 p-6 shadow-sm transition hover:border-[#FFAE42]/40 hover:shadow-md sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFAE42]/15 text-[#FFAE42] transition group-hover:scale-105">
              <BookOpen size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#FFAE42] sm:text-2xl">
                {t("settings.systemDocs")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                {t("settings.systemDocsBody")}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#FFAE42] px-6 py-3 text-sm font-bold text-white shadow-sm transition group-hover:bg-[#e89d35]">
            {t("settings.openDocs")}
          </span>
        </div>
      </Link>

      <CompanySettingsForm
        company={{
          name: user.company.name,
          email: user.company.email,
          phone: user.company.phone,
          address: user.company.address,
          website: user.company.website,
          logo: user.company.logo,
          taxNumber: user.company.taxNumber,
          invoiceHeader: user.company.invoiceHeader,
          invoiceFooter: user.company.invoiceFooter,
          signature: user.company.signature,
          stamp: user.company.stamp,
        }}
        settings={{
          themeColor: settings?.themeColor,
          accentColor: settings?.accentColor,
          fontFamily: settings?.fontFamily,
          currency: settings?.currency,
        }}
      />

      <div className="rounded-3xl border border-dashed border-[#FFAE42]/30 bg-gradient-to-br from-white to-[#FFAE42]/5 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-[#FFAE42]">
          {t("settings.invoiceTemplates")}
        </h2>
        <p className="mt-2 text-slate-600">{t("settings.invoiceTemplatesBody")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/settings/templates"
            className="rounded-2xl bg-[#FFAE42] px-5 py-3 font-bold text-white"
          >
            {t("settings.manageTemplates")}
          </Link>
          <Link
            href="/dashboard/settings/templates/new"
            className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 font-bold"
          >
            <Plus size={16} />
            {t("settings.newTemplate")}
          </Link>
        </div>
      </div>

      <UserAvatarForm
        user={{
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          avatar: user.avatar ?? null,
        }}
      />

      <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-8">
        <h2 className="mb-4 text-xl font-bold">{t("settings.userInfo")}</h2>
        <div className="mb-6 flex items-center gap-4">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.fullName}
              width={64}
              height={64}
              unoptimized
              className="size-16 rounded-full border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border bg-slate-50 text-sm font-bold text-slate-400">
              {user.fullName.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="font-semibold">{user.fullName}</p>
            <p className="text-sm text-slate-500">@{user.username}</p>
          </div>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">{t("common.name")}</dt>
            <dd className="font-semibold">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">{t("common.email")}</dt>
            <dd className="font-semibold">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">{t("settings.username")}</dt>
            <dd className="font-semibold">{user.username}</dd>
          </div>
        </dl>
      </div>

      <AutoSaveSettingsPanel />

      <NotificationPrefsPanel />

      <ChangePasswordForm />

      <RecordVersionHistorySection
        entityType={t("settings.entityType")}
        entityId={user.companyId}
        recordLabel={user.company.name}
      />
    </div>
  );
}
