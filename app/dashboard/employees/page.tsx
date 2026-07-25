import Link from "next/link";
import { ChartColumnIncreasing, IdCard, Plus } from "lucide-react";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import EmployeesBrowser from "@/components/employees/EmployeesBrowser";
import SalaryAlertsWatcher from "@/components/employees/SalaryAlertsWatcher";

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const employees = await db.employee.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      photo: true,
      fullName: true,
      username: true,
      phone: true,
      position: true,
      department: true,
      role: true,
      status: true,
      monthlySalary: true,
    },
  });

  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <SalaryAlertsWatcher />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-[#FFF8EF] px-3 py-1 text-sm font-bold text-[#FFAE42]">
            <IdCard size={16} />
            {employees.length} کارمەند · {activeCount} چالاک
          </div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            کارمەندان
          </h1>
          <p className="mt-2 text-slate-500">
            بەڕێوەبردنی کارمەند، ئامادەبوون، مۆڵەت و مووچە.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/employees/reports"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FFAE42]/25 bg-white px-5 py-3 font-bold text-[#FFAE42] transition hover:bg-[#FFF8EF]"
          >
            <ChartColumnIncreasing size={20} />
            ڕاپۆرتەکان
          </Link>
          <Link
            href="/dashboard/employees/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFAE42] px-5 py-3 font-bold text-white shadow-lg shadow-[#FFAE42]/20 transition hover:bg-[#E8942A]"
          >
            <Plus size={20} />
            کارمەندی نوێ
          </Link>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[rgba(255, 174, 66,0.25)] bg-white px-6 py-20 text-center shadow-sm">
          <IdCard className="mx-auto text-[#FFAE42]/35" size={48} />
          <h2 className="mt-4 text-2xl font-bold text-slate-700">
            هیچ کارمەندێک نییە
          </h2>
          <p className="mt-2 text-slate-500">
            یەکەم کارمەند زیاد بکە بۆ دەستپێکردنی مۆدیولی HR.
          </p>
          <Link
            href="/dashboard/employees/new"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#FFAE42] px-6 py-3 font-bold text-white"
          >
            <Plus size={20} />
            کارمەندی نوێ
          </Link>
        </div>
      ) : (
        <EmployeesBrowser
          initialData={employees.map((e) => ({
            ...e,
            monthlySalary: Number(e.monthlySalary),
          }))}
        />
      )}
    </div>
  );
}
