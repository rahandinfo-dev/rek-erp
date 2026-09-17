"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/uploads/ImageUpload";
import { FormAlert, FormField, FormSection, FormSubmitButton, inputClassName } from "@/components/ui/FormPrimitives";
import { appToast } from "@/lib/toast";
import { uploadMessages } from "@/lib/uploads/messages";

type Props = { user: { fullName: string; email: string; username: string; avatar: string | null; verified: boolean; emailVerifiedAt: Date | null; createdAt: Date; company: string } };

export default function UserAvatarForm({ user }: Props) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatar);
  const [fullName, setFullName] = useState(user.fullName);
  const [username, setUsername] = useState(user.username);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function persistAvatar(url: string | null) {
    setAvatar(url);
    setSavingAvatar(true);
    try {
      const res = await fetch("/api/account/avatar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: url }) });
      const data = await res.json();
      if (!res.ok) {
        setAvatar(user.avatar);
        appToast.error(data.message || uploadMessages.errors.failed);
        return;
      }
      appToast.success(data.message || "وێنەی پرۆفایل پاشەکەوتکرا.");
      router.refresh();
    } catch {
      setAvatar(user.avatar);
      appToast.error(uploadMessages.errors.network);
    } finally { setSavingAvatar(false); }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);
    try {
      const response = await fetch("/api/account/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, username }) });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const nextError = result.message || "هەڵەیەک ڕوویدا.";
        setError(nextError);
        appToast.error(nextError);
        return;
      }
      setMessage(result.message || "زانیارییەکانی بەکارهێنەر پاشەکەوتکرا.");
      appToast.settingsSaved(result.message || "زانیارییەکانی بەکارهێنەر پاشەکەوتکرا.");
      router.refresh();
    } catch {
      setError("پەیوەندی بە ڕاژەکارەوە سەرکەوتوو نەبوو.");
      appToast.error("پەیوەندی بە ڕاژەکارەوە سەرکەوتوو نەبوو.");
    } finally { setSavingProfile(false); }
  }

  return <div className="space-y-6">
    <FormSection title="وێنەی بەکارهێنەر" description="لە داشبۆرد و لیستی چالاکییەکاندا دەردەکەوێت.">
      <ImageUpload kind="avatar" value={avatar} onChange={(url) => void persistAvatar(url)} label="وێنەی پرۆفایل" shape="circle" disabled={savingAvatar} />
    </FormSection>
    <form onSubmit={saveProfile} className="space-y-6">
      <FormAlert type="error" message={error} />
      <FormAlert type="success" message={message} />
      <FormSection title="زانیارییەکانی بەکارهێنەر">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="ناوی تەواو"><input value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClassName} minLength={2} maxLength={120} required /></FormField>
          <FormField label="ناوی بەکارهێنەر"><input value={username} onChange={(event) => setUsername(event.target.value)} className={inputClassName} minLength={3} maxLength={64} pattern="[A-Za-z0-9_.-]+" required dir="ltr" /></FormField>
          <FormField label="ئیمەیڵ"><input value={user.email} className={inputClassName} readOnly dir="ltr" /></FormField>
          <FormField label="کۆمپانیا"><input value={user.company} className={inputClassName} readOnly /></FormField>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">ئیمەیڵ و وشەی نهێنی لە بەشی ئاسایش بەڕێوەدەبرێن؛ بۆیە لێرە دەستکاری ناکرێن.</p>
      </FormSection>
      <FormSection title="دۆخی هەژمار">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="border border-border bg-muted/40 p-3"><dt className="text-muted-foreground">پشتڕاستکردنەوەی ئیمەیڵ</dt><dd className="mt-1 font-black">{user.verified ? "پشتڕاستکراوە" : "پشتڕاست نەکراوە"}</dd></div>
          <div className="border border-border bg-muted/40 p-3"><dt className="text-muted-foreground">بەرواری دروستبوون</dt><dd className="mt-1 font-black">{new Intl.DateTimeFormat("ckb-IQ", { dateStyle: "medium" }).format(user.createdAt)}</dd></div>
          <div className="border border-border bg-muted/40 p-3"><dt className="text-muted-foreground">دوایین پشتڕاستکردنەوە</dt><dd className="mt-1 font-black">{user.emailVerifiedAt ? new Intl.DateTimeFormat("ckb-IQ", { dateStyle: "medium" }).format(user.emailVerifiedAt) : "بەردەست نییە"}</dd></div>
        </dl>
      </FormSection>
      <FormSubmitButton loading={savingProfile}>پاشەکەوتکردنی زانیاری</FormSubmitButton>
    </form>
  </div>;
}
