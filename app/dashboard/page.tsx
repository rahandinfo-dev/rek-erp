import { getCurrentUser } from "@/lib/auth/current-user";
import { loadDashboardHome } from "@/lib/dashboard/home";
import DashboardHomeWorkspace from "@/components/dashboard/workspace/DashboardHomeWorkspace";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await loadDashboardHome(user.companyId);

  return (
    <DashboardHomeWorkspace data={data} userName={user.fullName} />
  );
}
