"use client";
import { formatMoney } from "@/lib/utils/format";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  FileDown,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import BarcodeSvg from "@/components/barcode/BarcodeSvg";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";
import type { BarcodeLookupProduct } from "@/lib/barcode/lookup";
import { exportElementToPdf, printElement } from "@/lib/export";
import { appToast } from "@/lib/toast";

export type BarcodeProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
};

type Props = {
  products: BarcodeProduct[];
  companyName: string;
  companyLogo?: string | null;
};

type ScanMode = "select" | "open" | "create";

export default function BarcodeWorkbench({
  products: initial,
  companyName,
  companyLogo,
}: Props) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  const [query, setQuery] = useState("");
  const [barcodeFilter, setBarcodeFilter] = useState<"all" | "with" | "without">(
    "all"
  );
  const [selectedId, setSelectedId] = useState(initial[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("select");
  const [pendingCreateCode, setPendingCreateCode] = useState<string | null>(
    null
  );
  const labelRef = useRef<HTMLDivElement>(null);
  const pngHostRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (barcodeFilter === "with" && !p.barcode) return false;
      if (barcodeFilter === "without" && p.barcode) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q)
      );
    });
  }, [products, query, barcodeFilter]);

  const selected =
    filtered.find((p) => p.id === selectedId) ||
    products.find((p) => p.id === selectedId) ||
    filtered[0] ||
    null;

  function onScannedProduct(product: BarcodeLookupProduct) {
    setPendingCreateCode(null);
    setProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          salePrice: product.salePrice,
        },
        ...prev,
      ];
    });
    setSelectedId(product.id);
    setQuery(product.barcode || product.sku);

    if (scanMode === "open") {
      router.push(`/dashboard/products/${product.id}`);
    }
  }

  function onScannedNotFound(code: string) {
    setPendingCreateCode(code);
    if (scanMode === "create" || scanMode === "open") {
      router.push(
        `/dashboard/products/new?barcode=${encodeURIComponent(code)}`
      );
    }
  }

  async function generateBarcode(productId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${productId}/barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        appToast.error(json.message || "دروستکردنی بارکۆد سەرنەکەوت.");
        return;
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, barcode: json.data.barcode } : p
        )
      );
      setSelectedId(productId);
      appToast.success("بارکۆد دروستکرا", json.data.barcode);
    } finally {
      setBusy(false);
    }
  }

  function handlePrint() {
    if (!labelRef.current || !selected?.barcode) return;
    printElement(labelRef.current, selected.barcode);
    appToast.success("بارکۆد چاپکرا", selected.name);
  }

  async function downloadPng() {
    if (!selected?.barcode || !pngHostRef.current) return;
    const svg = pngHostRef.current.querySelector("svg");
    if (!svg) return;

    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(img.width, 400);
      canvas.height = Math.max(img.height, 160);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      canvas.toBlob((png) => {
        if (!png) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(png);
        a.download = `${selected.barcode}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        appToast.success("PNG داگیرا", selected.barcode || "");
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function downloadPdf() {
    if (!labelRef.current || !selected?.barcode) return;
    await exportElementToPdf(labelRef.current, `${selected.barcode}.pdf`);
    appToast.pdfGenerated(`PDFی بارکۆدی ${selected.name} داگیرا.`);
  }

  return (
    <div className="space-y-6">
      <section className="rek-card space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-primary">سکانەری بارکۆد</h2>
            <p className="text-xs text-muted-foreground">
              کامێرا · USB · گەڕان — دێسکتۆپ / تابلێت / مۆبایل
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "select", label: "هەڵبژاردن" },
                { id: "open", label: "کردنەوەی بەرهەم" },
                { id: "create", label: "زیادکردنی بەرهەم" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setScanMode(m.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                  scanMode === m.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-primary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <BarcodeScanner
          action={scanMode === "open" ? "open" : "select"}
          onProduct={onScannedProduct}
          onNotFound={onScannedNotFound}
          usbListen
          camera
        />

        {pendingCreateCode ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              بارکۆد <strong>{pendingCreateCode}</strong> نەدۆزرایەوە.
            </span>
            <Link
              href={`/dashboard/products/new?barcode=${encodeURIComponent(pendingCreateCode)}`}
              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              زیادکردنی بەرهەم
            </Link>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rek-card overflow-hidden">
          <div className="space-y-3 border-b border-border p-4">
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="گەڕان بە ناو / SKU / بارکۆد..."
                className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 outline-none focus:border-primary/50"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "هەموو" },
                  { id: "with", label: "بارکۆدی هەیە" },
                  { id: "without", label: "بێ بارکۆد" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBarcodeFilter(f.id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    barcodeFilter === f.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="max-h-[620px] overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-500">
                هیچ بەرهەمێک نەدۆزرایەوە
              </li>
            ) : (
              filtered.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(product.id)}
                    className={`flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-right transition ${
                      selected?.id === product.id
                        ? "bg-[#FFF8EF]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-bold text-[#1f1218]">
                      {product.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {product.sku}
                      {product.barcode
                        ? ` · ${product.barcode}`
                        : " · بارکۆد نییە"}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="space-y-4">
          {!selected ? (
            <div className="rek-card p-10 text-center text-slate-500">
              بەرهەمێک هەڵبژێرە یان سکان بکە
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void generateBarcode(selected.id)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 font-semibold text-white disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  دروستکردنی Code128
                </button>
                <Link
                  href={`/dashboard/products/${selected.id}`}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 font-semibold"
                >
                  کردنەوەی بەرهەم
                </Link>
                <button
                  type="button"
                  disabled={!selected.barcode}
                  onClick={handlePrint}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 font-semibold disabled:opacity-40"
                >
                  <Printer size={16} />
                  چاپ
                </button>
                <button
                  type="button"
                  disabled={!selected.barcode}
                  onClick={() => void downloadPng()}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 font-semibold disabled:opacity-40"
                >
                  <Download size={16} />
                  داگرتنی PNG
                </button>
                <button
                  type="button"
                  disabled={!selected.barcode}
                  onClick={() => void downloadPdf()}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#FFAE42]/30 px-4 font-semibold text-[#FFAE42] disabled:opacity-40"
                >
                  <FileDown size={16} />
                  داگرتنی PDF
                </button>
              </div>

              <div
                ref={labelRef}
                className="rek-card mx-auto max-w-md bg-white p-8 text-center"
              >
                {companyLogo ? (
                  <Image
                    src={companyLogo}
                    alt={companyName}
                    width={48}
                    height={48}
                    unoptimized
                    className="mx-auto mb-3 h-12 w-12 object-contain"
                  />
                ) : null}
                <p className="text-sm font-bold text-[#FFAE42]">
                  {companyName}
                </p>
                <h2 className="mt-2 text-xl font-black text-[#1f1218]">
                  {selected.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  SKU: {selected.sku}
                </p>
                <div ref={pngHostRef} className="mt-5 flex justify-center">
                  {selected.barcode ? (
                    <BarcodeSvg value={selected.barcode} height={72} />
                  ) : (
                    <p className="text-sm text-slate-400">
                      سەرەتا Code128 دروست بکە
                    </p>
                  )}
                </div>
                {selected.barcode ? (
                  <p className="mt-3 font-mono text-sm font-bold tracking-wide">
                    {selected.barcode}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-slate-500">
                  {formatMoney(selected.salePrice)}
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
