import { redirect } from "next/navigation";
import { getCurrentSuperAdmin } from "@/lib/super-admin/auth";
import SuperAdminLoginForm from "@/components/super-admin/SuperAdminLoginForm";

export default async function SuperAdminLoginPage() { const admin = await getCurrentSuperAdmin(); if (admin) redirect(admin.mustChangePassword ? "/admin/change-password" : "/admin"); return <main className="flex min-h-screen items-center justify-center bg-background p-4"><SuperAdminLoginForm /></main>; }
