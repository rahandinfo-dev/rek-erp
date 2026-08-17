"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SuperAdminLogoutButton() {
  const router = useRouter();
  return <button type="button" onClick={async () => { await fetch("/api/admin/auth/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-black text-muted-foreground hover:bg-muted"><LogOut size={16} />چوونەدەرەوە</button>;
}
