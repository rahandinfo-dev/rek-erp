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
  await document.fonts?.ready;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const receipt = element.querySelector<HTMLElement>(".invoice-a4, .invoice-thermal") || element;
  const canvas = await html2canvas(receipt, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
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
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const width = canvas.width * ratio;
  const height = canvas.height * ratio;
  const x = (pageWidth - width) / 2;

  pdf.addImage(imgData, "PNG", x, thermal ? 0 : 20, width, height);
  pdf.save(filename);
}

export function printElement(element: HTMLElement, title = "Print") {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        ${styles}
        <style>
          @font-face { font-family: "NRT"; src: url("${window.location.origin}/fonts/NRT-Reg.ttf") format("truetype"); font-weight: 400; font-style: normal; font-display: block; }
          html, body { font-family: "NRT", Tahoma, Arial, sans-serif; direction: rtl; margin: 0; padding: 0; background: #fff; }
          #invoice-preview { padding: 0 !important; overflow: visible !important; background: #fff !important; }
          img { max-width: 100%; }
        </style>
      </head>
      <body><main id="invoice-preview">${element.innerHTML}</main></body>
    </html>
  `);
  printWindow.document.close();
  void printWindow.document.fonts.ready.then(() => {
    printWindow.focus();
    printWindow.print();
  });
}
