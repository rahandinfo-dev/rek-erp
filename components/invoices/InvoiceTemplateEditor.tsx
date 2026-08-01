"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_INVOICE_CONFIG,
  SAMPLE_INVOICE_DATA,
  type InvoiceDocTypeOption,
  type InvoiceSizeOption,
  type InvoiceTemplateConfig,
} from "@/lib/invoices/template-config";
import InvoiceDocument from "@/components/invoices/InvoiceDocument";
import {
  FormAlert,
  FormField,
  FormSection,
  FormSubmitButton,
  inputClassName,
  selectClassName,
  textareaClassName,
} from "@/components/ui/FormPrimitives";
import {
  exportElementToPdf,
  printElement,
} from "@/lib/export";
import { reportClientNotification } from "@/lib/notifications/client";
import { appToast } from "@/lib/toast";
import { Download, Printer, Save } from "lucide-react";
import ImageUpload from "@/components/uploads/ImageUpload";

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
  company: CompanyInfo;
  initial?: {
    id?: string;
    name: string;
    isDefault: boolean;
    size: InvoiceSizeOption;
    docType: InvoiceDocTypeOption;
    config: InvoiceTemplateConfig;
  };
};

export default function InvoiceTemplateEditor({ company, initial }: Props) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(initial?.name || "قاڵبی سەرەکی");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? true);
  const [size, setSize] = useState<InvoiceSizeOption>(initial?.size || "A4");
  const [docType, setDocType] = useState<InvoiceDocTypeOption>(
    initial?.docType || "SALE"
  );
  const [config, setConfig] = useState<InvoiceTemplateConfig>(
    initial?.config ? { ...DEFAULT_INVOICE_CONFIG, ...initial.config, labels: { ...DEFAULT_INVOICE_CONFIG.labels, ...(initial.config.labels || {}) } } : DEFAULT_INVOICE_CONFIG
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const payload = useMemo(
    () => ({ name, isDefault, size, docType, config }),
    [name, isDefault, size, docType, config]
  );

  function patchConfig(patch: Partial<InvoiceTemplateConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const url = initial?.id
        ? `/api/invoice-templates/${initial.id}`
        : "/api/invoice-templates";
      const method = initial?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "پاشەکەوتکردن سەرنەکەوت.");
        return;
      }

      setSuccess(result.message || "پاشەکەوت کرا.");
      appToast.settingsSaved(result.message || "قاڵبی پسوولە پاشەکەوتکرا.");
      router.push("/dashboard/settings/templates");
      router.refresh();
    } catch {
      setError("هەڵەیەک ڕوویدا.");
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint() {
    if (!previewRef.current) return;
    printElement(previewRef.current, name);
    void reportClientNotification({
      type: "INVOICE_PRINTED",
      title: "پسوولە چاپکرا",
      message: `قاڵبی ${name} چاپکرا.`,
      href: "/dashboard/settings/templates",
      entityType: "InvoiceTemplate",
    });
  }

  async function handlePdf() {
    if (!previewRef.current) return;
    await exportElementToPdf(previewRef.current, `${name}.pdf`);
    void reportClientNotification({
      type: "PDF_GENERATED",
      title: "PDF دروستکرا",
      message: `PDFی قاڵبی ${name} دروستکرا.`,
      href: "/dashboard/settings/templates",
      entityType: "InvoiceTemplate",
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            دەستکاری قاڵبی پسوولە
          </h1>
          <p className="mt-2 text-slate-500">
            هەموو شتێک دەستکاری بکە و پێشبینینی ڕاستەوخۆ ببینە.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 font-semibold"
          >
            <Printer size={16} />
            چاپ
          </button>
          <button
            type="button"
            onClick={handlePdf}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 font-semibold"
          >
            <Download size={16} />
            PDF
          </button>
          <FormSubmitButton loading={saving}>
            <Save size={16} />
            پاشەکەوتکردنی قاڵب
          </FormSubmitButton>
        </div>
      </div>

      <FormAlert type="error" message={error} />
      <FormAlert type="success" message={success} />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <FormSection title="زانیاری قاڵب">
            <div className="space-y-4">
              <FormField label="ناوی قاڵب">
                <input
                  className={inputClassName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="قەبارە">
                  <select
                    className={selectClassName}
                    value={size}
                    onChange={(e) =>
                      setSize(e.target.value as InvoiceSizeOption)
                    }
                  >
                    <option value="A4">A4</option>
                    <option value="THERMAL">Thermal</option>
                    <option value="RECEIPT">Receipt</option>
                  </select>
                </FormField>
                <FormField label="جۆر">
                  <select
                    className={selectClassName}
                    value={docType}
                    onChange={(e) =>
                      setDocType(e.target.value as InvoiceDocTypeOption)
                    }
                  >
                    <option value="SALE">فرۆشتن</option>
                    <option value="PURCHASE">کڕین</option>
                    <option value="GENERIC">گشتی</option>
                  </select>
                </FormField>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                قاڵبی سەرەکی بێت
              </label>
            </div>
          </FormSection>

          <FormSection title="سەرپەڕە و پێپەڕە">
            <div className="space-y-4">
              <FormField label="دەقی Header">
                <select
                  className={inputClassName}
                  value={config.headerText}
                  onChange={(e) => patchConfig({ headerText: e.target.value })}
                ><option>پسوولەی فرۆشتن</option><option>پسوولەی کڕین</option><option>پسوولەی گشتی</option><option>فاتورەی فرۆشتن</option><option>فاتورەی کڕین</option>{!["پسوولەی فرۆشتن","پسوولەی کڕین","پسوولەی گشتی","فاتورەی فرۆشتن","فاتورەی کڕین"].includes(config.headerText) ? <option value={config.headerText}>{config.headerText}</option> : null}</select>
              </FormField>
              <FormField label="ناونیشانی تایبەت"><input className={inputClassName} value={config.headerText} onChange={(e) => patchConfig({headerText: e.target.value})}/></FormField>
              <FormField label="دەقی Footer">
                <input
                  className={inputClassName}
                  value={config.footerText}
                  onChange={(e) => patchConfig({ footerText: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(
                  [
                    ["showLogo", "لۆگۆ"],
                    ["showCompanyName", "ناوی کۆمپانیا"],
                    ["showPhone", "مۆبایل"],
                    ["showPhone2", "مۆبایلی دووەم"],
                    ["showEmail", "ئیمەیڵ"],
                    ["showWebsite", "وێبسایت"],
                    ["showAddress", "ناونیشان"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config[key]}
                      onChange={(e) =>
                        patchConfig({ [key]: e.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection title="زانیاری بازرگانی و ناونیشانەکان">
            <div className="space-y-4">
              <FormField label="ناونیشانی ژێر ناوی کۆمپانیا"><input className={inputClassName} value={config.companySubtitle} onChange={(e) => patchConfig({ companySubtitle: e.target.value })}/></FormField>
              <FormField label="ناونیشانی کۆمپانیا (جێگرەوە)"><input className={inputClassName} value={config.addressOverride} onChange={(e) => patchConfig({ addressOverride: e.target.value })}/></FormField>
              <FormField label="ژمارەی مۆبایلی یەکەم (جێگرەوە)"><input className={inputClassName} value={config.phone1} onChange={(e) => patchConfig({ phone1: e.target.value })}/></FormField>
              <FormField label="ژمارەی مۆبایلی دووەم"><input className={inputClassName} value={config.phone2} onChange={(e) => patchConfig({ phone2: e.target.value })}/></FormField>
              <div className="grid gap-3 sm:grid-cols-2"><FormField label="پێشگری بەڵگە (١-٣ پیت)"><input dir="ltr" maxLength={3} className={inputClassName} value={config.documentPrefix} onChange={(e) => patchConfig({ documentPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}/></FormField><FormField label="شێوازی کات"><select className={selectClassName} value={config.timeFormat} onChange={(e) => patchConfig({timeFormat: e.target.value as "12" | "24"})}><option value="12">12-hour (AM/PM)</option><option value="24">24-hour</option></select></FormField></div>
              <FormField label="شێوازی بەروار"><select className={selectClassName} value={config.dateFormat} onChange={(e) => patchConfig({dateFormat: e.target.value as InvoiceTemplateConfig["dateFormat"]})}><option>DD/MM/YYYY</option><option>YYYY/MM/DD</option><option>MM/DD/YYYY</option></select></FormField>
              <FormField label="ئاگاداری خوارەوە"><textarea className={textareaClassName} value={config.disclaimerText} onChange={(e) => patchConfig({disclaimerText: e.target.value})}/></FormField>
              <FormField label="دەقی سوپاس"><input className={inputClassName} value={config.thankYouText} onChange={(e) => patchConfig({ thankYouText: e.target.value })}/></FormField>
              <div className="grid grid-cols-2 gap-3 text-sm">{([['showSku','کۆدی کاڵا'],['showUnit','یەکە'],['showNotes','تێبینی'],['showDiscount','داشکاندن'],['showTax','باج'],['showSignatures','واژووەکان'],['showPrintedBy','چاپکراو لەلایەن'],['showPrintedAt','کاتی چاپ'],['showCustomerCode','کۆدی کڕیار'],['showCustomerPhone','مۆبایلی کڕیار'],['showCustomerAddress','ناونیشانی کڕیار'],['disclaimerEnabled','ئاگاداری خوارەوە']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={config[key]} onChange={(e) => patchConfig({[key]: e.target.checked})}/>{label}</label>)}</div>
              <p className="text-sm font-bold">دەستکاری ناونیشانەکان</p>
              <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(config.labels) as Array<keyof typeof config.labels>).map((key) => <FormField key={key} label={key}><input className={inputClassName} value={config.labels[key]} onChange={(e) => patchConfig({labels: {...config.labels, [key]: e.target.value}})}/></FormField>)}</div>
            </div>
          </FormSection>

          <FormSection title="ڕەنگ و فۆنت">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="ڕەنگی سەرەکی">
                <input
                  type="color"
                  className="h-12 w-full cursor-pointer rounded-xl border"
                  value={config.primaryColor}
                  onChange={(e) =>
                    patchConfig({ primaryColor: e.target.value })
                  }
                />
              </FormField>
              <FormField label="ڕەنگی دووەم">
                <input
                  type="color"
                  className="h-12 w-full cursor-pointer rounded-xl border"
                  value={config.accentColor}
                  onChange={(e) => patchConfig({ accentColor: e.target.value })}
                />
              </FormField>
              <FormField label="ڕەنگی دەق">
                <input
                  type="color"
                  className="h-12 w-full cursor-pointer rounded-xl border"
                  value={config.textColor}
                  onChange={(e) => patchConfig({ textColor: e.target.value })}
                />
              </FormField>
              <FormField label="پاشبنەما">
                <input
                  type="color"
                  className="h-12 w-full cursor-pointer rounded-xl border"
                  value={config.backgroundColor}
                  onChange={(e) =>
                    patchConfig({ backgroundColor: e.target.value })
                  }
                />
              </FormField>
              <FormField label="فۆنت">
                <select
                  className={selectClassName}
                  value={config.fontFamily}
                  onChange={(e) => patchConfig({ fontFamily: e.target.value })}
                >
                  <option value="Rudaw, Tahoma, sans-serif">Rudaw</option>
                  <option value="NRT, Rudaw, Tahoma, sans-serif">NRT</option>
                  <option value="Rabar, Rudaw, Tahoma, sans-serif">Rabar</option>
                  <option value="Tahoma, sans-serif">Tahoma</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Segoe UI', sans-serif">Segoe UI</option>
                </select>
              </FormField>
              <FormField label="فۆنتی ناونیشان"><select className={selectClassName} value={config.titleFontFamily} onChange={(e) => patchConfig({titleFontFamily: e.target.value})}><option value="Rudaw, Tahoma, sans-serif">Rudaw</option><option value="Tahoma, sans-serif">Tahoma</option><option value="system-ui, sans-serif">System</option></select></FormField>
              <FormField label="فۆنتی ژمارە"><select className={selectClassName} value={config.numericFontFamily} onChange={(e) => patchConfig({numericFontFamily: e.target.value})}><option value="Tahoma, Arial, sans-serif">Tahoma</option><option value="Arial, sans-serif">Arial</option><option value="system-ui, sans-serif">System</option></select></FormField>
              <FormField label="قەبارەی فۆنت">
                <input
                  type="number"
                  min={8}
                  max={24}
                  className={inputClassName}
                  value={config.fontSize}
                  onChange={(e) =>
                    patchConfig({ fontSize: Number(e.target.value) })
                  }
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="واتەرمارک / بارکۆد / QR">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={config.watermarkEnabled}
                  onChange={(e) =>
                    patchConfig({ watermarkEnabled: e.target.checked })
                  }
                />
                واتەرمارک
              </label>
              <FormField label="دەقی واتەرمارک">
                <input
                  className={inputClassName}
                  value={config.watermarkText}
                  onChange={(e) =>
                    patchConfig({ watermarkText: e.target.value })
                  }
                />
              </FormField>
              <FormField label="شەفافیەت">
                <input
                  type="range"
                  min={0.02}
                  max={0.3}
                  step={0.01}
                  value={config.watermarkOpacity}
                  onChange={(e) =>
                    patchConfig({
                      watermarkOpacity: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </FormField>
              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.barcodeEnabled}
                    onChange={(e) =>
                      patchConfig({ barcodeEnabled: e.target.checked })
                    }
                  />
                  Barcode
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.qrEnabled}
                    onChange={(e) =>
                      patchConfig({ qrEnabled: e.target.checked })
                    }
                  />
                  QR
                </label>
              </div>
            </div>
          </FormSection>

          <FormSection title="مەرج / واژوو / مۆر">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={config.termsEnabled}
                  onChange={(e) =>
                    patchConfig({ termsEnabled: e.target.checked })
                  }
                />
                مەرجەکان
              </label>
              <FormField label="دەقی مەرجەکان">
                <textarea
                  className={textareaClassName}
                  rows={3}
                  value={config.termsText}
                  onChange={(e) => patchConfig({ termsText: e.target.value })}
                />
              </FormField>

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={config.signatureEnabled}
                  onChange={(e) =>
                    patchConfig({ signatureEnabled: e.target.checked })
                  }
                />
                واژوو
              </label>
              <FormField label="ناونیشانی واژوو">
                <input
                  className={inputClassName}
                  value={config.signatureLabel}
                  onChange={(e) =>
                    patchConfig({ signatureLabel: e.target.value })
                  }
                />
              </FormField>
              <FormField label="وێنەی واژوو">
                <ImageUpload
                  kind="template"
                  value={config.signatureImage || null}
                  onChange={(url) =>
                    patchConfig({ signatureImage: url })
                  }
                  label="وێنەی واژوو"
                  shape="wide"
                />
              </FormField>

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={config.stampEnabled}
                  onChange={(e) =>
                    patchConfig({ stampEnabled: e.target.checked })
                  }
                />
                مۆر
              </label>
              <FormField label="وێنەی مۆر">
                <ImageUpload
                  kind="template"
                  value={config.stampImage || null}
                  onChange={(url) => patchConfig({ stampImage: url })}
                  label="وێنەی مۆر"
                  shape="square"
                />
              </FormField>
            </div>
          </FormSection>
        </div>

        <FormSection
          title="پێشبینینی ڕاستەوخۆ"
          description="گۆڕانکارییەکان دەستبەجێ دەردەکەون"
          className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-auto"
        >
          <div ref={previewRef} className="max-w-full min-w-0 overflow-x-auto bg-slate-100 p-4">
            <InvoiceDocument
              config={config}
              size={size}
              company={company}
              data={SAMPLE_INVOICE_DATA}
            />
          </div>
        </FormSection>
      </div>
    </form>
  );
}
