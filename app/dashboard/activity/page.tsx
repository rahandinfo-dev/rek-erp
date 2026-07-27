import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  loadAuditLogFilters,
  queryAuditLogs,
} from "@/lib/audit/query";
import ActivityTimeline from "@/components/activity/ActivityTimeline";
import { tServer } from "@/lib/i18n";

export default async function ActivityTimelinePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [filters, initial] = await Promise.all([
    loadAuditLogFilters(user.companyId),
    queryAuditLogs({
      companyId: user.companyId,
      page: 1,
      pageSize: 30,
    }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
          {tServer.t("activity.loading")}
        </div>
      }
    >
      <ActivityTimeline
        users={filters.users}
        initialItems={initial.items}
        viewerId={user.id}
      />
    </Suspense>
  );
}
