import { formatDate } from "@/lib/utils/datetime";

export function formatRelativeUpdated(
  ts: number | null | undefined,
  now = Date.now()
): string {
  if (!ts) return "";
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "Updated just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Updated ${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Updated ${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `Updated ${day} day${day === 1 ? "" : "s"} ago`;
  return `Updated ${formatDate(ts)}`;
}
