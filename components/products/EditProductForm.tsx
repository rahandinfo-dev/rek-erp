"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import { useNavigationHistory } from "@/lib/history/provider";
import ImageUpload from "@/components/uploads/ImageUpload";
import { useT } from "@/components/i18n/LocaleProvider";

type Unit = {
  id: string;
  name: string;
  symbol?: string;
  active?: boolean;
};

type Props = {
  id: string;
};

type ProductEditDraft = {
  name: string;
  sku: string;
  barcode: string;
  unitId: string;
  purchasePrice: number;
  costPrice: number;
  salePrice: number;
  profitMargin: number;
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  notes: string;
  image: string;
  active: boolean;
};

export default function EditProductForm({ id }: Props) {
  const { t } = useT();
  const router = useRouter();
  const { markEdited } = useNavigationHistory();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [units, setUnits] = useState<Unit[]>([]);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unitId, setUnitId] = useState("");

  const [purchasePrice, setPurchasePrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);

  const [profitMargin, setProfitMargin] = useState(0);

  const [currentStock, setCurrentStock] = useState(0);
  const [reservedStock, setReservedStock] = useState(0);
  const [minimumStock, setMinimumStock] = useState(0);

  const [notes, setNotes] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);
  const [warehouseName, setWarehouseName] = useState(() => t("nav.warehouse"));
  const [hydrated, setHydrated] = useState(false);

  const draftValue = useMemo<ProductEditDraft>(
    () => ({
      name,
      sku,
      barcode,
      unitId,
      purchasePrice,
      costPrice,
      salePrice,
      profitMargin,
      currentStock,
      reservedStock,
      minimumStock,
      notes,
      image,
      active,
    }),
    [
      name,
      sku,
      barcode,
      unitId,
      purchasePrice,
      costPrice,
      salePrice,
      profitMargin,
      currentStock,
      reservedStock,
      minimumStock,
      notes,
      image,
      active,
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
    key: `${DRAFT_KEYS.productEdit}:${id}`,
    value: draftValue,
    enabled: hydrated,
    isEmpty: () => false,
  });

  function applyDraft(data: ProductEditDraft) {
    setName(data.name || "");
    setSku(data.sku || "");
    setBarcode(data.barcode || "");
    setUnitId(data.unitId || "");
    setPurchasePrice(Number(data.purchasePrice) || 0);
    setCostPrice(Number(data.costPrice) || 0);
    setSalePrice(Number(data.salePrice) || 0);
    setProfitMargin(Number(data.profitMargin) || 0);
    setCurrentStock(Number(data.currentStock) || 0);
    setReservedStock(Number(data.reservedStock) || 0);
    setMinimumStock(Number(data.minimumStock) || 0);
    setNotes(data.notes || "");
    setImage(data.image || "");
    setActive(Boolean(data.active));
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [productRes, unitRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch("/api/units?activeOnly=true&pageSize=50&page=1"),
        ]);

        const productJson = await productRes.json();
        const unitJson = await unitRes.json();

        if (!productJson.success) {
          appToast.error(productJson.message || t("products.notFoundToast"));
          return;
        }

        const product = productJson.data;
        const loadedUnits: Unit[] = unitJson.data ?? [];

        if (
          product.unit &&
          !loadedUnits.some((u) => u.id === product.unitId)
        ) {
          loadedUnits.unshift({
            id: product.unit.id,
            name: product.unit.name,
            symbol: product.unit.symbol,
            active: product.unit.active,
          });
        }

        setUnits(loadedUnits);
        setWarehouseName(productJson.warehouseName || t("nav.warehouse"));

        setName(product.name);
        setSku(product.sku ?? "");
        setBarcode(product.barcode ?? "");
        setUnitId(product.unitId);

        setPurchasePrice(Number(product.purchasePrice));
        setCostPrice(Number(product.costPrice));
        setSalePrice(Number(product.salePrice));

        setProfitMargin(Number(product.profitMargin));

        setCurrentStock(Number(product.currentStock));
        setReservedStock(Number(product.reservedStock));
        setMinimumStock(Number(product.minimumStock));

        setNotes(product.notes ?? "");
        setImage(product.image ?? "");
        setActive(product.active);
        setHydrated(true);
      } catch (error) {
        console.error(error);
        appToast.error(t("errors.generic"));
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [id, t]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          sku,
          barcode: barcode || undefined,
          unitId,
          purchasePrice,
          costPrice,
          salePrice,
          profitMargin,
          currentStock,
          reservedStock,
          minimumStock,
          notes: notes || undefined,
          image: image || undefined,
          active,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        appToast.error(data.message || t("errors.generic"));
        return;
      }

      clearDraft();
      markEdited(`/dashboard/products/${id}`, name);
      appToast.productSaved(t("products.updated"));

      router.push(`/dashboard/products/${id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      appToast.error(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">
        {t("common.wait")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) applyDraft(data);
        }}
        onDiscard={discardDraft}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-bold">{t("products.nameLabel")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-bold">SKU</label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full rounded-xl border border-border p-3"
            required
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-bold">{t("nav.barcode")}</label>
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="w-full rounded-xl border border-border p-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-bold">{t("nav.units")}</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="w-full rounded-xl border border-border bg-card p-3"
            required
          >
            <option value="">{t("common.select")}</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
                {unit.symbol ? ` (${unit.symbol})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
        <span className="font-bold text-primary">{t("products.warehouseLabel")}</span>
        <span className="text-foreground">{warehouseName}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <input
          type="number"
          step="0.01"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(Number(e.target.value))}
          placeholder={t("products.purchasePrice")}
          className="rounded-xl border border-border p-3"
        />
        <input
          type="number"
          step="0.01"
          value={costPrice}
          onChange={(e) => setCostPrice(Number(e.target.value))}
          placeholder={t("products.cost")}
          className="rounded-xl border border-border p-3"
        />
        <input
          type="number"
          step="0.01"
          value={salePrice}
          onChange={(e) => setSalePrice(Number(e.target.value))}
          placeholder={t("products.salePrice")}
          className="rounded-xl border border-border p-3"
        />
        <input
          type="number"
          step="0.01"
          value={profitMargin}
          onChange={(e) => setProfitMargin(Number(e.target.value))}
          placeholder={t("products.profitMargin")}
          className="rounded-xl border border-border p-3"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <input
          type="number"
          step="0.01"
          value={currentStock}
          onChange={(e) => setCurrentStock(Number(e.target.value))}
          placeholder={t("products.currentStock")}
          className="rounded-xl border border-border p-3"
        />
        <input
          type="number"
          step="0.01"
          value={reservedStock}
          onChange={(e) => setReservedStock(Number(e.target.value))}
          placeholder={t("products.reservedStock")}
          className="rounded-xl border border-border p-3"
        />
        <input
          type="number"
          step="0.01"
          value={minimumStock}
          onChange={(e) => setMinimumStock(Number(e.target.value))}
          placeholder={t("products.stockAlert")}
          className="rounded-xl border border-border p-3"
        />
      </div>

      <ImageUpload
        kind="product"
        value={image || null}
        onChange={(url) => setImage(url || "")}
        label={t("products.imageLabel")}
        shape="square"
      />

      <div>
        <label className="mb-2 block font-bold">{t("common.notes")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-border p-3"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="active"
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <label htmlFor="active">{t("products.productActive")}</label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? t("common.wait") : t("common.saveChanges")}
        </button>
      </div>
    </form>
  );
}
