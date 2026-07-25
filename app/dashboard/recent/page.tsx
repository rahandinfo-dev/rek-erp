import { Suspense } from "react";
import RecentlyViewedPage from "@/components/history/RecentlyViewedPage";

export default function RecentPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="rek-skeleton h-16 rounded-2xl" />
          <div className="rek-skeleton h-64 rounded-2xl" />
        </div>
      }
    >
      <RecentlyViewedPage />
    </Suspense>
  );
}
