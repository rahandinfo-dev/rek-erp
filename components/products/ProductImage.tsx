"use client";

import ImageUpload from "@/components/uploads/ImageUpload";
import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";
import { useT } from "@/components/i18n/LocaleProvider";

export default function ProductImage() {
  const { t } = useT();
  const { watch, setValue } = useFormContext<ProductFormValues>();
  const image = watch("image") || "";

  return (
    <div className="rek-card space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-black text-foreground">
        {t("products.imageLabel")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("common.optional")}</p>
      <ImageUpload
        kind="product"
        value={image || null}
        onChange={(url) =>
          setValue("image", url || "", {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        label={t("products.image")}
        description={t("products.imageDesc")}
        shape="square"
      />
    </div>
  );
}
