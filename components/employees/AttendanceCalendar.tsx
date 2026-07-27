"use client";

import { useT } from "@/components/i18n/LocaleProvider";
import type { attendanceStatuses } from "@/lib/validators/employee";

type Status = (typeof attendanceStatuses)[number];

type AttendanceItem = {
  id: string;
  date: string;
  status: Status | string;
  notes?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500 text-white",
  ABSENT: "bg-rose-500 text-white",
  LATE: "bg-amber-500 text-white",
  LEAVE: "bg-sky-500 text-white",
  HALF_DAY: "bg-violet-500 text-white",
};

const WEEKDAY_KEYS = [
  "employees.weekdayMon",
  "employees.weekdayTue",
  "employees.weekdayWed",
  "employees.weekdayThu",
  "employees.weekdayFri",
  "employees.weekdaySat",
  "employees.weekdaySun",
] as const;

const ATTENDANCE_KEYS = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
  "HALF_DAY",
] as const;

export default function AttendanceCalendar({
  year,
  month,
  items,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  items: AttendanceItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const { t } = useT();
  const map = new Map(
    items.map((item) => [item.date.slice(0, 10), item.status])
  );

  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // Monday-first grid: JS getUTCDay Sunday=0
  const startPad = (first.getUTCDay() + 6) % 7;

  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ day: null, key: `pad-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: `d-${d}` });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className="py-1">
            {t(key)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map(({ day, key }) => {
          if (!day) {
            return <div key={key} className="aspect-square" />;
          }
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const status = map.get(iso);
          const selected = selectedDate === iso;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(iso)}
              title={
                status
                  ? t(`employees.attendance.${status}`) || status
                  : t("employees.noAttendanceRecord")
              }
              className={`aspect-square rounded-2xl border text-sm font-bold transition ${
                selected
                  ? "border-[#FFAE42] ring-2 ring-[#FFAE42]/30"
                  : "border-transparent"
              } ${
                status
                  ? STATUS_COLORS[status] || "bg-slate-200"
                  : "bg-slate-50 text-slate-600 hover:bg-[#FFF8EF]"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {ATTENDANCE_KEYS.map((key) => (
          <span
            key={key}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[key]}`}
          >
            {t(`employees.attendance.${key}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
