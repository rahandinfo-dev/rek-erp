export async function postDraftAudit(input: {
  draftKey: string;
  action: string;
  detail?: unknown;
  device?: string;
}) {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    await fetch("/api/drafts/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
