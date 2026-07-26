import { cookies } from "next/headers";
import DashboardShell, {
  SIDEBAR_COLLAPSE_COOKIE,
} from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);

  if (!user) {
    redirect("/login");
  }

  // Read on the server so the rail renders at its final width in the initial
  // HTML — no hydration mismatch and no post-hydration layout jump.
  const collapsed = cookieStore.get(SIDEBAR_COLLAPSE_COOKIE)?.value === "1";

  const currentUser = {
    id: user.id,
    companyId: user.companyId,
    fullName: user.fullName,
    avatar: user.avatar,
    company: {
      name: user.company.name,
      logo: user.company.logo,
    },
  };

  return (
    <DashboardShell user={currentUser} initialCollapsed={collapsed}>
      {children}
    </DashboardShell>
  );
}
