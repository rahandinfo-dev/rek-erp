export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCsv(
  filename: string,
  rows: Record<string, string | number | null | undefined>[]
) {
  if (rows.length === 0) {
    downloadBlob(filename, new Blob([""], { type: "text/csv;charset=utf-8;" }));
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = row[key] ?? "";
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(filename, blob);
}

export async function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, string | number | null | undefined>[]
) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    filename,
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string
) {
  // Browser PDF output uses the exact same DOM, CSS layout engine and font
  // shaping as print. Raster-based PDFs subtly change Kurdish glyph metrics.
  await openInvoicePrintDialog(element, filename.replace(/\.pdf$/i, ""));
}

async function ensureInvoiceAssets(element: HTMLElement, targetDocument: Document) {
  const fontSet = targetDocument.fonts;
  await fontSet?.load('16px "NRT"', "پسوولەی کڕین و فرۆشتن");
  await fontSet?.ready;

  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          })
    )
  );

  // Give the browser one complete layout/paint cycle after fonts and images
  // settle so the print window reads the preview's final metrics.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

export async function printElement(element: HTMLElement, title = "Print") {
  await openInvoicePrintDialog(element, title);
}

async function openInvoicePrintDialog(element: HTMLElement, title: string) {
  await ensureInvoiceAssets(element, document);
  const receipt =
    element.matches(".invoice-a4, .invoice-thermal")
      ? element
      : element.querySelector<HTMLElement>(".invoice-a4, .invoice-thermal");
  if (!receipt) return;
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        ${styles}
      </head>
      <body><main id="invoice-preview">${receipt.outerHTML}</main></body>
    </html>
  `);
  printWindow.document.close();
  await ensureInvoiceAssets(
    printWindow.document.querySelector<HTMLElement>("#invoice-preview")!,
    printWindow.document
  );
  printWindow.focus();
  printWindow.print();
  printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
}
