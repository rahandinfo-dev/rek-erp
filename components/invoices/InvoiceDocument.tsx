"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { formatMoney } from "@/lib/utils/format";
import type {
  InvoicePreviewData,
  InvoiceSizeOption,
  InvoiceTemplateConfig,
} from "@/lib/invoices/template-config";

type CompanyInfo = {
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

type Props = {
  config: InvoiceTemplateConfig;
  size: InvoiceSizeOption;
  company: CompanyInfo;
  data: InvoicePreviewData;
  className?: string;
};

function sizeStyles(size: InvoiceSizeOption) {
  if (size === "THERMAL") {
    return { width: 320, padding: 12 };
  }
  if (size === "RECEIPT") {
    return { width: 280, padding: 10 };
  }
  return { width: 794, padding: 28 };
}

export default function InvoiceDocument({
  config,
  size,
  company,
  data,
  className,
}: Props) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const dims = sizeStyles(size);
  const compact = size !== "A4";
  const headerText = company.invoiceHeader || config.headerText;
  const footerText = company.invoiceFooter || config.footerText;
  const signatureImage = company.signature || config.signatureImage;
  const stampImage = company.stamp || config.stampImage;
  const showSignature = Boolean(signatureImage) || config.signatureEnabled;
  const showStamp = Boolean(stampImage) || config.stampEnabled;

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      if (config.barcodeEnabled && barcodeRef.current) {
        const JsBarcode = (await import("jsbarcode")).default;
        if (cancelled) return;
        try {
          JsBarcode(barcodeRef.current, data.invoiceNo, {
            format: "CODE128",
            displayValue: !compact,
            fontSize: 12,
            height: compact ? 36 : 48,
            margin: 0,
            background: "transparent",
          });
        } catch {
          // ignore invalid barcode content
        }
      }

      if (config.qrEnabled && qrRef.current) {
        const QRCode = (await import("qrcode")).default;
        if (cancelled) return;
        await QRCode.toCanvas(qrRef.current, data.invoiceNo, {
          width: compact ? 72 : 96,
          margin: 0,
          color: {
            dark: config.textColor,
            light: "#00000000",
          },
        });
      }
    }

    draw();
    return () => {
      cancelled = true;
    };
  }, [
    config.barcodeEnabled,
    config.qrEnabled,
    config.textColor,
    data.invoiceNo,
    compact,
  ]);

  return (
    <div
      className={className}
      style={{
        width: dims.width,
        maxWidth: "100%",
        marginInline: "auto",
        padding: dims.padding,
        background: config.backgroundColor,
        color: config.textColor,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
      }}
    >
      {config.watermarkEnabled && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            opacity: config.watermarkOpacity,
            transform: "rotate(-28deg)",
            fontSize: compact ? 28 : 64,
            fontWeight: 900,
            color: config.primaryColor,
            whiteSpace: "nowrap",
          }}
        >
          {config.watermarkText}
        </div>
      )}

      <div
        style={{
          borderBottom: `3px solid ${config.primaryColor}`,
          paddingBottom: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {config.showLogo && company.logo && (
              <Image
                src={company.logo}
                alt={company.name}
                width={compact ? 40 : 64}
                height={compact ? 40 : 64}
                unoptimized
                style={{ objectFit: "contain" }}
              />
            )}
            <div>
              {config.showCompanyName && (
                <h1
                  style={{
                    margin: 0,
                    fontSize: compact ? 16 : 24,
                    color: config.primaryColor,
                    fontWeight: 900,
                  }}
                >
                  {company.name}
                </h1>
              )}
              {headerText ? (
                <p style={{ margin: "4px 0 0", opacity: 0.75 }}>
                  {headerText}
                </p>
              ) : null}
            </div>
          </div>

          <div style={{ textAlign: "left", fontSize: compact ? 11 : 12 }}>
            <div style={{ fontWeight: 800 }}>{data.invoiceNo}</div>
            <div>بەروار: {data.date}</div>
            {data.time ? <div>کات: {data.time}</div> : null}
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gap: 2,
            fontSize: compact ? 10 : 12,
            opacity: 0.85,
          }}
        >
          {config.showPhone && company.phone && <div>{company.phone}</div>}
          {config.showEmail && company.email && <div>{company.email}</div>}
          {config.showWebsite && company.website && (
            <div>{company.website}</div>
          )}
          {config.showAddress && company.address && (
            <div>{company.address}</div>
          )}
          {company.taxNumber ? <div>باج: {company.taxNumber}</div> : null}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ opacity: 0.6, marginBottom: 4 }}>لایەن</div>
          <div style={{ fontWeight: 700 }}>{data.customerOrSupplier}</div>
        </div>
        <div>
          <div style={{ opacity: 0.6, marginBottom: 4 }}>کۆگا</div>
          <div style={{ fontWeight: 700 }}>{data.warehouse}</div>
        </div>
        {data.paymentMethod ? (
          <div>
            <div style={{ opacity: 0.6, marginBottom: 4 }}>پارەدان</div>
            <div style={{ fontWeight: 700 }}>{data.paymentMethod}</div>
          </div>
        ) : null}
        {data.createdBy ? (
          <div>
            <div style={{ opacity: 0.6, marginBottom: 4 }}>دروستکراو لەلایەن</div>
            <div style={{ fontWeight: 700 }}>{data.createdBy}</div>
          </div>
        ) : null}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: `${config.primaryColor}14` }}>
            <th style={thStyle}>بەرهەم</th>
            {!compact && <th style={thStyle}>بڕ</th>}
            <th style={thStyle}>نرخ</th>
            <th style={thStyle}>کۆ</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                {item.sku && (
                  <div style={{ fontSize: 10, opacity: 0.6 }}>{item.sku}</div>
                )}
                {compact && (
                  <div style={{ fontSize: 10, opacity: 0.7 }}>
                    × {item.quantity}
                  </div>
                )}
              </td>
              {!compact && <td style={tdStyle}>{item.quantity}</td>}
              <td style={tdStyle}>{formatMoney(item.unitPrice)}</td>
              <td style={tdStyle}>{formatMoney(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div style={{ minWidth: compact ? "100%" : 220 }}>
          <Row label="ژێرکۆ" value={formatMoney(data.subtotal)} />
          <Row label="داشکاندن" value={formatMoney(data.discount)} />
          <Row label="باج" value={formatMoney(data.tax)} />
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 12,
              background: config.primaryColor,
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 800,
            }}
          >
            <span>کۆی گشتی</span>
            <span>{formatMoney(data.total)} IQD</span>
          </div>
        </div>
      </div>

      {(config.barcodeEnabled || config.qrEnabled) && (
        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          {config.barcodeEnabled ? (
            <svg ref={barcodeRef} style={{ maxWidth: "60%" }} />
          ) : (
            <span />
          )}
          {config.qrEnabled && <canvas ref={qrRef} />}
        </div>
      )}

      {config.termsEnabled && config.termsText && (
        <div
          style={{
            marginTop: 18,
            padding: 12,
            borderRadius: 12,
            background: `${config.accentColor}22`,
            fontSize: compact ? 10 : 11,
          }}
        >
          <strong>مەرجەکان:</strong> {config.termsText}
        </div>
      )}

      {(showSignature || showStamp) && (
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {showSignature && (
            <div style={{ textAlign: "center" }}>
              {signatureImage ? (
                <Image
                  src={signatureImage}
                  alt="signature"
                  width={120}
                  height={60}
                  unoptimized
                  style={{ margin: "0 auto 8px", objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    height: 48,
                    borderBottom: `1px dashed ${config.primaryColor}`,
                    marginBottom: 8,
                  }}
                />
              )}
              <div style={{ fontSize: 11 }}>{config.signatureLabel}</div>
            </div>
          )}
          {showStamp && (
            <div style={{ textAlign: "center" }}>
              {stampImage ? (
                <Image
                  src={stampImage}
                  alt="stamp"
                  width={80}
                  height={80}
                  unoptimized
                  style={{ margin: "0 auto 8px", objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    margin: "0 auto 8px",
                    borderRadius: "999px",
                    border: `2px dashed ${config.accentColor}`,
                  }}
                />
              )}
              <div style={{ fontSize: 11 }}>مۆر</div>
            </div>
          )}
        </div>
      )}

      {footerText ? (
        <div
          style={{
            marginTop: 20,
            paddingTop: 12,
            borderTop: `1px solid ${config.primaryColor}33`,
            textAlign: "center",
            opacity: 0.75,
            fontSize: compact ? 10 : 11,
          }}
        >
          {footerText}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        fontSize: 12,
      }}
    >
      <span style={{ opacity: 0.65 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "right",
  padding: "8px 6px",
  fontSize: 11,
};

const tdStyle: React.CSSProperties = {
  textAlign: "right",
  padding: "8px 6px",
  verticalAlign: "top",
};
