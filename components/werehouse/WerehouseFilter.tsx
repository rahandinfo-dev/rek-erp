"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function WerehouseFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = searchParams.get("filter") || "all";

  const changeFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }

    router.replace(`/dashboard/werehouse?${params.toString()}`);
  };

  const buttonClass = (active: boolean) =>
    `rounded-xl px-5 py-2 transition ${
      active
        ? "bg-[#FFAE42] text-white"
        : "bg-white border border-slate-300 hover:bg-slate-100"
    }`;

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => changeFilter("all")}
        className={buttonClass(current === "all")}
      >
        هەموو
      </button>

      <button
        onClick={() => changeFilter("main")}
        className={buttonClass(current === "main")}
      >
        کۆگای سەرەکی
      </button>

      <button
        onClick={() => changeFilter("secondary")}
        className={buttonClass(current === "secondary")}
      >
        کۆگای لاوەکی
      </button>
    </div>
  );
}