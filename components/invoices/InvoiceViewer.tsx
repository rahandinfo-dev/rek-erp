"use client";
import { formatDate, formatTime } from "@/lib/utils/datetime";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileDown,
  History,
  Printer,
} from "lucide-react";
import InvoiceDocument from "@/components/invoices/InvoiceDocument";
import { exportElementToPdf, printElement } from "@/lib/export";
import { appToast } from "@/lib/toast";
import { useNavigationHistory } from "@/lib/history/provider";
import { usePathname } from "next/navigation";
import type {
  InvoicePreviewData,
  InvoiceSizeOption,
  InvoiceTemplateConfig,
} from "@/lib/invoices/template-config";

type HistoryEvent = {
  id: string;
  userName: string | null;
  createdAt: string | Date;
  filename?: string | null;
  note?: string | null;
};

type Props = {
  invoiceId: string;
  invoiceNo: string;
  company: {
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    logo?: string | null;
    taxNumber?: string | null;
    invoiceHeader?: string | null;
    invoiceFooter?: string | null;
    signature?: string | null;
    stamp?: string | null;
  };
  config: InvoiceTemplateConfig;
  size: InvoiceSizeOption;
  data: InvoicePreviewData;
  templateName: string;
  printHistory: HistoryEvent[];
  pdfHistory: HistoryEvent[];
  /** Auto-trigger print dialog when landing with ?print=1 */
  autoPrint?: boolean;
  /** Auto-download PDF when landing with ?pdf=1 */
  autoPdf?: boolean;
};

function formatWhen(value: string | Date) {
  return `${formatDate(value)} ${formatTime(value)}`;
}

export default function InvoiceViewer({
  invoiceId,
  invoiceNo,
  company,
  config,
  size,
  data,
  templateName,
  printHistory: initialPrints,
  pdfHistory: initialPdfs,
  autoPrint = false,
  autoPdf = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [printHistory, setPrintHistory] = useState(initialPrints);
  const { markPrinted, markDownloaded } = useNavigationHistory();
  const pathname = usePathname() || `/dashboard/invoices/${invoiceId}`;
  const [pdfHistory, setPdfHistory] = useState(initialPdfs);
  const [busy, setBusy] = useState(false);
  const autoRan = useRef(false);

  async function recordPrint() {
    const res = await fetch(`/api/invoices/${invoiceId}/print`, {
      method: "POST",
    });
    const json = await res.json();
    if (json.success && json.data) {
      setPrintHistory((prev) => [json.data, ...prev]);
    }
  }

  async function recordPdf(filename: string) {
    const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      setPdfHistory((prev) => [json.data, ...prev]);
    }
  }

  function scrollPreview() {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handlePrint() {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      await printElement(ref.current, invoiceNo);
      await recordPrint();
      markPrinted(pathname, invoiceNo, "invoices");
      appToast.invoicePrinted(`پسوولەی ${invoiceNo} چاپکرا.`);
    } finally {
      setBusy(false);
    }
  }

  async function handlePdf(mode: "generate" | "download") {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const filename = `${invoiceNo}.pdf`;
      await exportElementToPdf(ref.current, filename);
      await recordPdf(filename);
      markDownloaded(pathname, invoiceNo, "invoices");
      if (mode === "generate") {
        appToast.pdfGenerated(`PDFی ${invoiceNo} دروستکرا.`);
      } else {
        appToast.pdfGenerated(`PDFی ${invoiceNo} داگیرا.`);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autoRan.current) return;
    if (!autoPrint && !autoPdf) return;
    autoRan.current = true;
    const t = window.setTimeout(() => {
      if (autoPrint) void handlePrint();
      else if (autoPdf) void handlePdf("download");
    }, 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [autoPrint, autoPdf]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={scrollPreview}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 font-semibold"
        >
          <Eye size={16} />
          پێشبینین
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePdf("generate")}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 font-semibold disabled:opacity-50"
        >
          <FileDown size={16} />
          دروستکردنی PDF
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePrint()}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 font-semibold text-white disabled:opacity-50"
        >
          <Printer size={16} />
          چاپ
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePdf("download")}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#FFAE42]/30 px-4 font-semibold text-[#FFAE42] disabled:opacity-50"
        >
          <Download size={16} />
          داگرتنی PDF
        </button>
      </div>

      <div className="grid gap-3 rounded-3xl border border-[rgba(255, 174, 66,0.1)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="بەروار" value={data.date} />
        <Meta label="کات" value={data.time || "—"} />
        <Meta label="قاڵب" value={templateName} />
        <Meta label="پارەدان" value={data.paymentMethod || "—"} />
      </div>

      <div
        ref={ref}
        id="invoice-preview"
        className="max-w-full min-w-0 overflow-x-auto rounded-3xl bg-slate-100 p-4"
      >
        <InvoiceDocument
          config={config}
          size={size}
          company={company}
          data={data}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HistoryCard
          title="مێژووی چاپ"
          icon={<Printer size={16} />}
          empty="هێشتا چاپ نەکراوە."
          items={printHistory.map((e) => ({
            id: e.id,
            title: e.userName || "بەکارهێنەر",
            subtitle: e.note || "چاپ",
            when: formatWhen(e.createdAt),
          }))}
        />
        <HistoryCard
          title="مێژووی PDF"
          icon={<History size={16} />}
          empty="هێشتا PDF دروست نەکراوە."
          items={pdfHistory.map((e) => ({
            id: e.id,
            title: e.userName || "بەکارهێنەر",
            subtitle: e.filename || e.note || "PDF",
            when: formatWhen(e.createdAt),
          }))}
        />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF8EF] px-4 py-3">
      <p className="text-xs font-semibold text-[#FFAE42]/70">{label}</p>
      <p className="mt-1 font-bold text-[#1f1218]">{value}</p>
    </div>
  );
}

function HistoryCard({
  title,
  icon,
  empty,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  items: Array<{ id: string; title: string; subtitle: string; when: string }>;
}) {
  return (
    <section className="rek-card p-5">
      <div className="mb-4 flex items-center gap-2 font-bold text-[#FFAE42]">
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-100 px-3 py-2"
            >
              <p className="font-semibold text-[#1f1218]">{item.title}</p>
              <p className="text-sm text-slate-500">{item.subtitle}</p>
              <p className="mt-1 text-xs text-slate-400">{item.when}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
