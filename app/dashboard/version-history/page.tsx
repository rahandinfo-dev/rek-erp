import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import VersionHistoryClient from "@/components/versions/VersionHistoryClient";
import { tServer } from "@/lib/i18n";

export default async function VersionHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">
          {tServer.t("versions.loadingPage")}
        </p>
      }
    >
      <VersionHistoryClient />
    </Suspense>
  );
}
