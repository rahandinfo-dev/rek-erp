"use client";

import ImageUpload from "@/components/uploads/ImageUpload";
import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";

export default function ProductImage() {
  const { watch, setValue } = useFormContext<ProductFormValues>();
  const image = watch("image") || "";

  return (
    <div className="rek-card space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-black text-foreground">وێنەی بەرهەم</h2>
      <p className="text-xs text-muted-foreground">ئارەزوومەندانە</p>
      <ImageUpload
        kind="product"
        value={image || null}
        onChange={(url) =>
          setValue("image", url || "", {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        label="وێنە"
        description="ڕاکێشان، کرتە، گۆڕین یان سڕینەوە"
        shape="square"
      />
    </div>
  );
}
