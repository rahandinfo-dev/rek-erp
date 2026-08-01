export function formatReceiptMoney(value: number, currency: string) {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "IQD" ? 0 : 2,
    maximumFractionDigits: currency === "IQD" ? 0 : 2,
  }).format(value);
  return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}

export function formatReceiptTime(value: string | undefined, format: "12" | "24") {
  if (!value || format === "24") return value || "—";
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]}${match[3] ? `:${match[3]}` : ""} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatReceiptDate(value: string, format: "DD/MM/YYYY" | "YYYY/MM/DD" | "MM/DD/YYYY") {
  const match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(value);
  if (!match) return value;
  const [, day, month, year] = match;
  if (format === "YYYY/MM/DD") return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;
  if (format === "MM/DD/YYYY") return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}
