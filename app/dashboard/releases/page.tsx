import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import ReleasesClient from "@/components/versions/ReleasesClient";
export default async function ReleasesPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return <ReleasesClient />;
}
