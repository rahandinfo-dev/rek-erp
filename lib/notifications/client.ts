import { appToast } from "@/lib/toast";

export async function reportClientNotification(input: {
  type: "INVOICE_PRINTED" | "PDF_GENERATED" | "ERROR" | "WARNING";
  message: string;
  title?: string;
  href?: string;
  entityType?: string;
  entityId?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  showToast?: boolean;
}) {
  try {
    await fetch("/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (input.showToast === false) return;

    if (input.type === "INVOICE_PRINTED") {
      appToast.invoicePrinted(input.message);
    } else if (input.type === "PDF_GENERATED") {
      appToast.pdfGenerated(input.message);
    } else if (input.type === "ERROR") {
      appToast.error(input.title || "هەڵە", input.message);
    } else if (input.type === "WARNING") {
      appToast.warning(input.title || "ئاگاداری", input.message);
    }
  } catch (error) {
    console.error("CLIENT NOTIFICATION ERROR:", error);
  }
}
