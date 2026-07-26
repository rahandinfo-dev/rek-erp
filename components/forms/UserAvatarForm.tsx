"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/uploads/ImageUpload";
import { appToast } from "@/lib/toast";
import { uploadMessages } from "@/lib/uploads/messages";

type Props = {
  user: {
    fullName: string;
    email: string;
    username: string;
    avatar: string | null;
  };
};

export default function UserAvatarForm({ user }: Props) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatar);
  const [saving, setSaving] = useState(false);

  async function persist(url: string | null) {
    setAvatar(url);
    setSaving(true);
    try {
      const res = await fetch("/api/account/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        appToast.error(data.message || uploadMessages.errors.failed);
        return;
      }
      appToast.success(data.message || "وێنەی پڕۆفایل پاشەکەوتکرا.");
      router.refresh();
    } catch {
      appToast.error(uploadMessages.errors.network);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-8 dark:bg-card">
      <h2 className="mb-1 text-xl font-bold">وێنەی بەکارهێنەر</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {user.fullName} · @{user.username}
      </p>
      <ImageUpload
        kind="avatar"
        value={avatar}
        onChange={(url) => void persist(url)}
        label="وێنەی پڕۆفایل"
        description="لە سەرەوەی داشبۆرد دەردەکەوێت"
        shape="circle"
        disabled={saving}
      />
    </div>
  );
}
