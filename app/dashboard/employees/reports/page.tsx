import { getCurrentUser } from "@/lib/auth/current-user";
import { buildEmployeeReports } from "@/lib/employees/reports";
import EmployeeReportsClient from "@/components/employees/EmployeeReportsClient";

export default async function EmployeeReportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await buildEmployeeReports(user.companyId);

  return <EmployeeReportsClient data={data} />;
}
