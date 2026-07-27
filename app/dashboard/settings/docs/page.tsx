import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import LearningCenterHub from "@/components/docs/LearningCenterHub";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "فێرکاری سیستەم",
};

export default async function DocsHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition hover:text-[#FFAE42]"
      >
        <ChevronLeft size={16} />
        گەڕانەوە بۆ ڕێکخستنەکان
      </Link>
      <LearningCenterHub />
    </div>
  );
}
