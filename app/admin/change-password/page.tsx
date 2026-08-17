import { redirect } from "next/navigation";
import { getCurrentSuperAdmin } from "@/lib/super-admin/auth";
import SuperAdminPasswordForm from "@/components/super-admin/SuperAdminPasswordForm";

export default async function SuperAdminChangePasswordPage() { const admin = await getCurrentSuperAdmin(); if (!admin) redirect("/admin/login"); if (!admin.mustChangePassword) redirect("/admin"); return <main className="flex min-h-screen items-center justify-center bg-background p-4"><SuperAdminPasswordForm /></main>; }
