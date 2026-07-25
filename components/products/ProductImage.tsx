"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";
import { appToast } from "@/lib/toast";

export default function ProductImage() {
  const { watch, setValue } = useFormContext<ProductFormValues>();
  const image = watch("image") || "";
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "product");
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      const url = data.data?.url as string | undefined;
      if (!data.success || !url) {
        appToast.error(data.message || "بارکردنی وێنە سەرنەکەوت.");
        return;
      }
      setValue("image", url, { shouldDirty: true, shouldValidate: true });
      appToast.success("وێنە بارکرا");
    } catch {
      appToast.error("بارکردنی وێنە سەرنەکەوت.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rek-card space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-black text-foreground">وێنەی بەرهەم</h2>
      <p className="text-xs text-muted-foreground">ئارەزوومەندانە</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-secondary">
          {image ? (
            <Image
              src={image}
              alt="وێنەی بەرهەم"
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-primary/30">
              <ImagePlus size={48} />
            </div>
          )}
        </div>

        <label className="flex h-full min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 transition hover:bg-primary/10">
          {uploading ? (
            <Loader2 className="animate-spin text-primary" size={36} />
          ) : (
            <ImagePlus className="text-primary" size={36} />
          )}
          <p className="mt-4 text-lg font-bold text-foreground">
            {uploading ? "بارکردن..." : "کرتە بکە بۆ هەڵبژاردنی وێنە"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">PNG · JPG · WEBP</p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
