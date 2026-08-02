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
  await ensureInvoiceAssets(element, document);
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const receipt = element.querySelector<HTMLElement>(".invoice-a4, .invoice-thermal") || element;
  const canvas = await html2canvas(receipt, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: receipt.scrollWidth,
    height: receipt.scrollHeight,
    windowWidth: receipt.scrollWidth,
    windowHeight: receipt.scrollHeight,
    onclone: (clonedDocument) => {
      const clonedReceipt = clonedDocument.querySelector<HTMLElement>(
        ".invoice-a4, .invoice-thermal"
      );
      clonedReceipt?.classList.add("invoice-export-capture");
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const thermal = receipt.classList.contains("invoice-thermal");
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "landscape" : "portrait",
    format: thermal ? [80, Math.max(80, receipt.scrollHeight * 0.264583)] : "a4",
    unit: thermal ? "mm" : "pt",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (thermal) {
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  } else {
    // Preserve the browser's A4 width and paginate vertically instead of
    // shrinking a long invoice (which changes text metrics and readability).
    const sourcePageHeight = Math.floor(canvas.width * pageHeight / pageWidth);
    const receiptBounds = receipt.getBoundingClientRect();
    const captureScale = canvas.width / receiptBounds.width;
    const protectedBlocks = Array.from(
      receipt.querySelectorAll<HTMLElement>(
        ".invoice-items tr, .invoice-summary, .invoice-footer"
      )
    ).map((node) => {
      const bounds = node.getBoundingClientRect();
      return {
        start: Math.round((bounds.top - receiptBounds.top) * captureScale),
        end: Math.round((bounds.bottom - receiptBounds.top) * captureScale),
      };
    });

    for (let top = 0, page = 0; top < canvas.height; page += 1) {
      const desiredBottom = Math.min(top + sourcePageHeight, canvas.height);
      const crossingBlock = protectedBlocks.find(
        ({ start, end }) => start > top && start < desiredBottom && end > desiredBottom
      );
      const bottom = crossingBlock && crossingBlock.start - top > sourcePageHeight * 0.35
        ? crossingBlock.start
        : desiredBottom;
      const sliceHeight = bottom - top;
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      pageCanvas.getContext("2d")?.drawImage(
        canvas,
        0,
        top,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );
      if (page > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(
        pageCanvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidth,
        sliceHeight * pageWidth / canvas.width
      );
      top = bottom;
    }
  }
  pdf.save(filename);
}

const NRT_FONT_URL = "/fonts/NRT-Reg.ttf";

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
  // settle so html2canvas and the print window read the preview's final metrics.
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
  await ensureInvoiceAssets(element, document);
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
        <style>
          @font-face { font-family: "NRT"; src: url("${window.location.origin}${NRT_FONT_URL}") format("truetype"); font-weight: 400; font-style: normal; font-display: block; }
          html, body, .invoice-a4, .invoice-a4 *, .invoice-thermal, .invoice-thermal * { font-family: "NRT" !important; font-synthesis: none; }
          html, body { direction: rtl; margin: 0; padding: 0; background: #fff; }
          #invoice-preview { padding: 0 !important; overflow: visible !important; background: #fff !important; }
          img { max-width: 100%; }
        </style>
      </head>
      <body><main id="invoice-preview">${element.innerHTML}</main></body>
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
