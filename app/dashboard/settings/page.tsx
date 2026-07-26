import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import CompanySettingsForm from "@/components/forms/CompanySettingsForm";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import AutoSaveSettingsPanel from "@/components/unsaved/AutoSaveSettingsPanel";
import NotificationPrefsPanel from "@/components/pwa/NotificationPrefsPanel";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";
import { FileText, Hash, Plus } from "lucide-react";

export default async function SettingsPage() {
  const user = await getCurrentUser();

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
            پڕۆفایلی کۆمپانیا
          </h1>
          <p className="mt-2 text-slate-500">
            لۆگۆ، پەیوەندی، باج، سەرپەڕە/پێپەڕە، واژوو و مۆر
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/settings/numbering"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FFAE42]/20 bg-white px-5 py-3 font-bold text-[#FFAE42] hover:bg-[#FFAE42]/5"
          >
            <Hash size={18} />
            Auto Numbering
          </Link>
          <Link
            href="/dashboard/settings/templates"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FFAE42]/20 bg-white px-5 py-3 font-bold text-[#FFAE42] hover:bg-[#FFAE42]/5"
          >
            <FileText size={18} />
            قاڵبەکان ({templatesCount})
          </Link>
        </div>
      </div>

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
        <h2 className="text-xl font-bold text-[#FFAE42]">قاڵبی پسوولە</h2>
        <p className="mt-2 text-slate-600">
          Header، Footer، ڕەنگ، فۆنت، واتەرمارک، Barcode، QR، مەرج، واژوو و مۆر —
          هەمووی دەستکاری بصری و پێشبینینی ڕاستەوخۆ.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/settings/templates"
            className="rounded-2xl bg-[#FFAE42] px-5 py-3 font-bold text-white"
          >
            بەڕێوەبردنی قاڵبەکان
          </Link>
          <Link
            href="/dashboard/settings/templates/new"
            className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 font-bold"
          >
            <Plus size={16} />
            قاڵبی نوێ
          </Link>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-8">
        <h2 className="mb-4 text-xl font-bold">زانیاری بەکارهێنەر</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">ناو</dt>
            <dd className="font-semibold">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ئیمەیڵ</dt>
            <dd className="font-semibold">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">ناوی بەکارهێنەر</dt>
            <dd className="font-semibold">{user.username}</dd>
          </div>
        </dl>
      </div>

      <AutoSaveSettingsPanel />

      <NotificationPrefsPanel />

      <ChangePasswordForm />

      <RecordVersionHistorySection
        entityType="ڕێکخستنەکان"
        entityId={user.companyId}
        recordLabel={user.company.name}
      />
    </div>
  );
}
