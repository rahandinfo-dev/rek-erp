"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FormAlert,
  FormField,
  FormSection,
  FormSubmitButton,
  inputClassName,
  textareaClassName,
} from "@/components/ui/FormPrimitives";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar } from "@/components/ui/AutoSaveStatus";

type Props = {
  company: {
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    website: string | null;
    logo: string | null;
    taxNumber?: string | null;
    invoiceHeader?: string | null;
    invoiceFooter?: string | null;
    signature?: string | null;
    stamp?: string | null;
  };
  settings?: {
    themeColor?: string;
    accentColor?: string;
    fontFamily?: string;
    currency?: string;
  };
};

type SettingsDraft = {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo: string;
  taxNumber: string;
  invoiceHeader: string;
  invoiceFooter: string;
  signature: string;
  stamp: string;
  themeColor: string;
  accentColor: string;
  fontFamily: string;
  currency: string;
};

export default function CompanySettingsForm({ company, settings }: Props) {
  const router = useRouter();
  const baseline = useMemo<SettingsDraft>(
    () => ({
      name: company.name,
      email: company.email,
      phone: company.phone ?? "",
      address: company.address ?? "",
      website: company.website ?? "",
      logo: company.logo ?? "",
      taxNumber: company.taxNumber ?? "",
      invoiceHeader: company.invoiceHeader ?? "",
      invoiceFooter: company.invoiceFooter ?? "",
      signature: company.signature ?? "",
      stamp: company.stamp ?? "",
      themeColor: settings?.themeColor || "#FFAE42",
      accentColor: settings?.accentColor || "#FFF8EF",
      fontFamily: settings?.fontFamily || "Rudaw",
      currency: settings?.currency || "IQD",
    }),
    [company, settings]
  );

  const [name, setName] = useState(baseline.name);
  const [email, setEmail] = useState(baseline.email);
  const [phone, setPhone] = useState(baseline.phone);
  const [address, setAddress] = useState(baseline.address);
  const [website, setWebsite] = useState(baseline.website);
  const [logo, setLogo] = useState(baseline.logo);
  const [taxNumber, setTaxNumber] = useState(baseline.taxNumber);
  const [invoiceHeader, setInvoiceHeader] = useState(baseline.invoiceHeader);
  const [invoiceFooter, setInvoiceFooter] = useState(baseline.invoiceFooter);
  const [signature, setSignature] = useState(baseline.signature);
  const [stamp, setStamp] = useState(baseline.stamp);
  const [themeColor, setThemeColor] = useState(baseline.themeColor);
  const [accentColor, setAccentColor] = useState(baseline.accentColor);
  const [fontFamily, setFontFamily] = useState(baseline.fontFamily);
  const [currency, setCurrency] = useState(baseline.currency);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const draftValue = useMemo<SettingsDraft>(
    () => ({
      name,
      email,
      phone,
      address,
      website,
      logo,
      taxNumber,
      invoiceHeader,
      invoiceFooter,
      signature,
      stamp,
      themeColor,
      accentColor,
      fontFamily,
      currency,
    }),
    [
      name,
      email,
      phone,
      address,
      website,
      logo,
      taxNumber,
      invoiceHeader,
      invoiceFooter,
      signature,
      stamp,
      themeColor,
      accentColor,
      fontFamily,
      currency,
    ]
  );

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: DRAFT_KEYS.companySettings,
    value: draftValue,
    isEmpty: (v) => JSON.stringify(v) === JSON.stringify(baseline),
  });

  function applySettingsDraft(data: SettingsDraft) {
    setName(data.name);
    setEmail(data.email);
    setPhone(data.phone);
    setAddress(data.address);
    setWebsite(data.website);
    setLogo(data.logo);
    setTaxNumber(data.taxNumber);
    setInvoiceHeader(data.invoiceHeader);
    setInvoiceFooter(data.invoiceFooter);
    setSignature(data.signature);
    setStamp(data.stamp);
    setThemeColor(data.themeColor);
    setAccentColor(data.accentColor);
    setFontFamily(data.fontFamily);
    setCurrency(data.currency);
  }

  async function uploadImage(
    file: File,
    onDone: (url: string) => void
  ) {
    try {
      setUploading(true);
      setError("");
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "company");

      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const result = await res.json();
      if (!res.ok) {
        setError(result.message || "بارکردن سەرنەکەوت.");
        appToast.error(result.message || "بارکردن سەرنەکەوت.");
        return;
      }
      onDone(result.data.url);
      setMessage("وێنە بارکرا. پاشەکەوتی بکە بۆ جێگیرکردن.");
    } catch {
      setError("هەڵەیەک ڕوویدا.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      setSaving(true);

      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          website,
          logo,
          taxNumber,
          invoiceHeader,
          invoiceFooter,
          signature,
          stamp,
          themeColor,
          accentColor,
          fontFamily,
          currency,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "هەڵەیەک ڕوویدا.");
        appToast.error(result.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      setMessage(result.message || "پاشەکەوت کرا.");
      appToast.settingsSaved(result.message || "پڕۆفایلی کۆمپانیا پاشەکەوتکرا.");
      clearDraft();
      router.refresh();
    } catch {
      setError("هەڵەیەک ڕوویدا.");
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) applySettingsDraft(data);
        }}
        onDiscard={discardDraft}
      />

      <FormAlert type="error" message={error} />
      <FormAlert type="success" message={message} />

      <FormSection
        title="لۆگۆی کۆمپانیا"
        description="لە داشبۆرد، سایدبار، پسوولە، ڕاپۆرت، PDF و چاپدا دەردەکەوێت"
      >
        <AssetUpload
          label="لۆگۆ"
          url={logo}
          uploading={uploading}
          onUpload={(file) => void uploadImage(file, setLogo)}
          onClear={() => setLogo("")}
        />
      </FormSection>

      <FormSection title="پڕۆفایلی کۆمپانیا">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="ناوی کۆمپانیا">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClassName}
              required
            />
          </FormField>
          <FormField label="ئیمەیڵ">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              required
            />
          </FormField>
          <FormField label="مۆبایل">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="وێبسایت">
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputClassName}
              placeholder="https://"
            />
          </FormField>
          <FormField label="ژمارەی باج">
            <input
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className={inputClassName}
              placeholder="ژمارەی باج"
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="ناونیشان">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={textareaClassName}
              rows={3}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="پسوولە"
        description="سەرپەڕە، پێپەڕە، واژوو و مۆر — خۆکار لە پسوولە / PDF / چاپدا بەکاردێن"
      >
        <div className="grid gap-4">
          <FormField label="سەرپەڕەی پسوولە (Invoice Header)">
            <input
              value={invoiceHeader}
              onChange={(e) => setInvoiceHeader(e.target.value)}
              className={inputClassName}
              placeholder="پسوولەی فرۆشتن"
            />
          </FormField>
          <FormField label="پێپەڕەی پسوولە (Invoice Footer)">
            <textarea
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              className={textareaClassName}
              rows={2}
              placeholder="سوپاس بۆ بازرگانیکردنتان"
            />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <AssetUpload
              label="واژوو (Signature)"
              url={signature}
              uploading={uploading}
              onUpload={(file) => void uploadImage(file, setSignature)}
              onClear={() => setSignature("")}
            />
            <AssetUpload
              label="مۆر (Stamp)"
              url={stamp}
              uploading={uploading}
              onUpload={(file) => void uploadImage(file, setStamp)}
              onClear={() => setStamp("")}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="ڕەنگ و فۆنت">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="ڕەنگی سەرەکی">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="h-12 w-full cursor-pointer rounded-xl border"
            />
          </FormField>
          <FormField label="ڕەنگی دووەم">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-12 w-full cursor-pointer rounded-xl border"
            />
          </FormField>
          <FormField label="فۆنت">
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className={inputClassName}
            >
              <option value="Rudaw">Rudaw</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Segoe UI">Segoe UI</option>
            </select>
          </FormField>
          <FormField label="دراو">
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClassName}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSubmitButton loading={saving || uploading}>
        پاشەکەوتکردنی پڕۆفایل
      </FormSubmitButton>
    </form>
  );
}

function AssetUpload({
  label,
  url,
  uploading,
  onUpload,
  onClear,
}: {
  label: string;
  url: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border bg-slate-50">
          {url ? (
            <Image
              src={url}
              alt={label}
              width={96}
              height={96}
              unoptimized
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-slate-400">نییە</span>
          )}
        </div>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          {url ? (
            <button
              type="button"
              onClick={onClear}
              className="block text-sm text-red-600"
            >
              سڕینەوە
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
