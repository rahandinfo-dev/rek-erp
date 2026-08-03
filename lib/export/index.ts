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

const NRT_FONT_URL = "/fonts/NRT-Reg.ttf";
let nrtFontBytes: Promise<ArrayBuffer> | undefined;

function loadNrtFontBytes() {
  nrtFontBytes ??= fetch(NRT_FONT_URL).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to load the PDF font (${response.status}).`);
    }
    return response.arrayBuffer();
  });
  return nrtFontBytes;
}

async function embedNrtFont(targetDocument: Document) {
  const targetWindow = targetDocument.defaultView;
  if (!targetWindow) throw new Error("The PDF renderer is unavailable.");

  // A newly opened print document does not reliably finish loading linked
  // stylesheets before document.fonts.load() runs. Install the bundled bytes
  // in that document's own FontFaceSet so Chromium embeds NRT in the PDF
  // instead of silently resolving the family name to a system fallback.
  const font = new targetWindow.FontFace("NRT", await loadNrtFontBytes(), {
    style: "normal",
    weight: "400",
  });
  targetDocument.fonts.add(font);
  await font.load();

  if (font.status !== "loaded" || !targetDocument.fonts.has(font)) {
    throw new Error("NRT could not be embedded in the PDF renderer.");
  }
}

async function ensureInvoiceAssets(element: HTMLElement, targetDocument: Document) {
  await embedNrtFont(targetDocument);
  const fontSet = targetDocument.fonts;
  const FontFaceConstructor = targetDocument.defaultView?.FontFace;
  if (!fontSet || !FontFaceConstructor) {
    throw new Error("This browser cannot embed the NRT invoice font.");
  }

  // Add the bundled face to this specific document (including the detached
  // print document). Merely copying a stylesheet can race PDF capture and let
  // the browser shape Kurdish with a fallback face.
  if (!targetDocument.documentElement.dataset.invoiceNrtLoaded) {
    const fontUrl = new URL("/fonts/NRT-Reg.ttf", window.location.origin).href;
    const nrt = new FontFaceConstructor(
      "NRT",
      `url("${fontUrl}") format("truetype")`,
      { style: "normal", weight: "400" }
    );
    const loadedNrt = await nrt.load();
    fontSet.add(loadedNrt);
    targetDocument.documentElement.dataset.invoiceNrtLoaded = "true";
  }

  await fontSet?.load('16px "NRT"', "پسوولەی کڕین و فرۆشتن");
  await fontSet?.ready;
  if (!fontSet.check('16px NRT', "پسوولەی کڕین و فرۆشتن")) {
    throw new Error("NRT did not load; invoice PDF export was cancelled.");
  }

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

const INVOICE_TYPOGRAPHY_PROPERTIES = [
  "fontFamily", "fontSize", "fontStyle", "fontWeight", "lineHeight",
  "letterSpacing", "wordSpacing", "direction", "unicodeBidi",
] as const;

function invoiceTypography(element: HTMLElement) {
  const view = element.ownerDocument.defaultView;
  if (!view) throw new Error("Invoice document has no rendering context.");
  return [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))].map((node) => {
    const style = view.getComputedStyle(node);
    const family = style.fontFamily.replace(/["']/g, "").trim();
    if (family !== "NRT") {
      throw new Error(`Invoice export requires NRT, but found ${style.fontFamily}.`);
    }
    return INVOICE_TYPOGRAPHY_PROPERTIES.map((property) => style[property]).join("|");
  });
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
  const previewTypography = invoiceTypography(receipt);
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <base href="${escapeHtml(`${window.location.origin}/`)}">
        <style id="invoice-nrt-font">
          @font-face {
            font-family: "NRT";
            src: url("/fonts/NRT-Reg.ttf") format("truetype");
            font-weight: 400;
            font-style: normal;
            font-display: block;
          }
        </style>
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
  const printedReceipt = printWindow.document.querySelector<HTMLElement>(
    ".invoice-a4, .invoice-thermal"
  );
  if (!printedReceipt) throw new Error("The invoice was not copied for PDF export.");
  const printTypography = invoiceTypography(printedReceipt);
  if (
    previewTypography.length !== printTypography.length ||
    previewTypography.some((value, index) => value !== printTypography[index])
  ) {
    printWindow.close();
    throw new Error("PDF typography does not match the invoice preview.");
  }
  printWindow.focus();
  printWindow.print();
  printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
}
