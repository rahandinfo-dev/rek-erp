import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, History, KeyRound, Save, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import CompanySettingsForm from "@/components/forms/CompanySettingsForm";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import UserAvatarForm from "@/components/forms/UserAvatarForm";
import AutoSaveSettingsPanel from "@/components/unsaved/AutoSaveSettingsPanel";
import NotificationPrefsPanel from "@/components/pwa/NotificationPrefsPanel";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";

const SECTION_META = {
  company: { title: "پڕۆفایلی کۆمپانیا", icon: Building2 },
  user: { title: "زانیاری بەکارهێنەر", icon: UserRound },
  "auto-save": { title: "پاشەکەوتی خۆکار", icon: Save },
  notifications: { title: "ڕێکخستنی ئاگادارکردنەوە", icon: Save },
  password: { title: "گۆڕینی وشەی نهێنی", icon: KeyRound },
  versions: { title: "مێژووی وەشان", icon: History },
} as const;

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(section in SECTION_META)) notFound();
  const user = await getCurrentUser();
  if (!user) return null;
  const meta = SECTION_META[section as keyof typeof SECTION_META];
  const Icon = meta.icon;
  const settings = section === "company" ? await db.settings.findUnique({ where: { companyId: user.companyId } }) : null;
  let content: React.ReactNode;
  if (section === "company") {
    content = <CompanySettingsForm company={{ name: user.company.name, email: user.company.email, phone: user.company.phone, address: user.company.address, website: user.company.website, logo: user.company.logo, taxNumber: user.company.taxNumber, invoiceHeader: user.company.invoiceHeader, invoiceFooter: user.company.invoiceFooter, signature: user.company.signature, stamp: user.company.stamp }} settings={{ themeColor: settings?.themeColor, accentColor: settings?.accentColor, fontFamily: settings?.fontFamily, currency: settings?.currency }} />;
  } else if (section === "user") {
    content = <UserAvatarForm user={{ fullName: user.fullName, email: user.email, username: user.username, avatar: user.avatar ?? null }} />;
  } else if (section === "auto-save") {
    content = <AutoSaveSettingsPanel />;
  } else if (section === "notifications") {
    content = <NotificationPrefsPanel />;
  } else if (section === "password") {
    content = <ChangePasswordForm />;
  } else {
    content = <RecordVersionHistorySection entityType="کۆمپانیا" entityId={user.companyId} recordLabel={user.company.name} />;
  }
  return <div className="mx-auto max-w-6xl space-y-6" dir="rtl"><Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><ArrowRight size={17} />گەڕانەوە بۆ ڕێکخستنەکان</Link><header className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={23}/></span><h1 className="text-3xl font-black text-primary">{meta.title}</h1></header>{content}</div>;
}
