import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildReports } from "@/lib/reports/buildReports";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";

const ReportsClient = dynamic(
  () => import("@/components/reports/ReportsClient"),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-3xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-muted" />
      </div>
    ),
  }
);

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await buildReports(user.companyId, {
    preset: "month",
    granularity: "monthly",
  });

  return (
    <div className="space-y-6">
      <ReportsClient companyName={user.company.name} initialData={data} />
      <RecordVersionHistorySection
        entityType="Report"
        entityId={user.companyId}
        recordLabel="Reports"
      />
      <RecordVersionHistorySection
        entityType="Expense"
        entityId={user.companyId}
        recordLabel="Expenses"
      />
    </div>
  );
}
