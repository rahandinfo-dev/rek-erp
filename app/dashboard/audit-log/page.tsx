import { getCurrentUser } from "@/lib/auth/current-user";
import {
  loadAuditLogFilters,
  queryAuditLogs,
} from "@/lib/audit/query";
import AuditLogClient from "@/components/audit/AuditLogClient";

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [filters, initial] = await Promise.all([
    loadAuditLogFilters(user.companyId),
    queryAuditLogs({
      companyId: user.companyId,
      page: 1,
      pageSize: 25,
    }),
  ]);

  return (
    <AuditLogClient
      users={filters.users}
      initialItems={initial.items}
      initialPagination={initial.pagination}
    />
  );
}
