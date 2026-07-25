"use client";

import Link from "next/link";
import Image from "next/image";
import { UserRound } from "lucide-react";
import {
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/lib/employees/labels";
import ContextMenuSurface from "@/components/quick-actions/ContextMenuSurface";

export type EmployeeCardData = {
  id: string;
  photo: string | null;
  fullName: string;
  username: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: string;
  status: string;
  monthlySalary?: string | number | null;
};

export default function EmployeeCard({
  employee,
}: {
  employee: EmployeeCardData;
}) {
  const statusTone =
    employee.status === "ACTIVE"
      ? "bg-emerald-500"
      : employee.status === "SUSPENDED"
        ? "bg-amber-500"
        : "bg-slate-500";

  return (
    <ContextMenuSurface
      className="h-full"
      record={{
        id: employee.id,
        moduleKey: "employees",
        label: employee.fullName,
        href: `/dashboard/employees/${employee.id}`,
        entityType: "Employee",
        archived: employee.status !== "ACTIVE",
      }}
    >
    <Link
      href={`/dashboard/employees/${employee.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[rgba(255, 174, 66,0.1)] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-[rgba(255, 174, 66,0.28)] hover:shadow-xl hover:shadow-[#FFAE42]/12"
    >
      <div className="relative flex items-center gap-4 bg-gradient-to-br from-[#FFF8EF] to-white p-5">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-sm">
          {employee.photo ? (
            <Image
              src={employee.photo}
              alt={employee.fullName}
              fill
              unoptimized
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#FFAE42]/40">
              <UserRound size={28} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black text-[#1f1218] transition group-hover:text-[#FFAE42]">
            {employee.fullName}
          </h3>
          <p className="truncate text-sm text-slate-500">@{employee.username}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${statusTone}`}
        >
          {EMPLOYEE_STATUS_LABELS[employee.status] || employee.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 text-xs">
        <Meta label="پۆست" value={employee.position || "—"} />
        <Meta label="مۆبایل" value={employee.phone || "—"} />
        <Meta
          label="مووچە"
          value={
            employee.monthlySalary != null && employee.monthlySalary !== ""
              ? `${Number(employee.monthlySalary).toLocaleString("en-US")} IQD`
              : "—"
          }
        />
        <Meta
          label="ڕۆڵ"
          value={EMPLOYEE_ROLE_LABELS[employee.role] || employee.role}
        />
      </div>
    </Link>
    </ContextMenuSurface>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-semibold text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-slate-700">{value}</p>
    </div>
  );
}
