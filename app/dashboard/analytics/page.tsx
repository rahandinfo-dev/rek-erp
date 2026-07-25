import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCachedAnalytics } from "@/lib/cache/company-reads";

const AnalyticsClient = dynamic(
  () => import("@/components/analytics/AnalyticsClient"),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-3xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-muted" />
      </div>
    ),
  }
);

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getCachedAnalytics(user.companyId);

  return (
    <AnalyticsClient initialData={data} companyName={user.company.name} />
  );
}
