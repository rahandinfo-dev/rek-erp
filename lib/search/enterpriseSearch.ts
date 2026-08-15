import { db } from "@/lib/prisma/db";
import { matchCatalog } from "@/lib/search/catalog";
import { fuzzyMatchFields, queryVariants } from "@/lib/search/fuzzy";
import type {
  SearchGroup,
  SearchHit,
  SearchModuleFilter,
  SearchResultPayload,
} from "@/lib/search/types";

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

function orContains(fields: string[], variants: string[]) {
  const clauses: Array<Record<string, ReturnType<typeof contains>>> = [];
  for (const field of fields) {
    for (const v of variants) {
      clauses.push({ [field]: contains(v) });
    }
  }
  return clauses;
}

function productHitType(
  q: string,
  product: { name: string; sku: string; barcode: string | null }
): "product" | "sku" | "barcode" {
  const ql = q.toLowerCase();
  if (product.barcode && product.barcode.toLowerCase() === ql) return "barcode";
  if (product.sku.toLowerCase() === ql) return "sku";
  if (product.barcode && product.barcode.toLowerCase().includes(ql)) {
    return "barcode";
  }
  if (product.sku.toLowerCase().includes(ql)) return "sku";
  return "product";
}

function pushGroup(
  groups: SearchGroup[],
  key: string,
  label: string,
  items: SearchHit[]
) {
  if (items.length === 0) return;
  groups.push({ key, label, items });
}

function looksLikeCode(q: string) {
  return /^[A-Za-z0-9\-_.]{4,64}$/.test(q) && !/\s/.test(q);
}

/**
 * Enterprise global search — company-scoped, parallel entity queries,
 * soft-delete aware, typo-tolerant variants, preview payloads.
 */
export async function runEnterpriseSearch(input: {
  companyId: string;
  query: string;
  take?: number;
  filter?: SearchModuleFilter;
}): Promise<SearchResultPayload> {
  const q = input.query.trim();
  const take = Math.min(12, Math.max(4, input.take || 8));
  const filter = input.filter || "all";

  if (!q) {
    return { query: q, groups: [], total: 0, exactHref: null };
  }

  const companyId = input.companyId;
  const variants = queryVariants(q);
  const primary = variants[0] || q;

  let exactHref: string | null = null;

  // Exact barcode / SKU → jump target
  if (looksLikeCode(q) && (filter === "all" || filter === "products")) {
    const exact =
      (await db.product.findFirst({
        where: {
          companyId,
          active: true,
          OR: [
            { barcode: { equals: q, mode: "insensitive" } },
            { sku: { equals: q, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      })) || null;
    if (exact) exactHref = `/dashboard/products/${exact.id}`;
  }

  const wantProducts = filter === "all" || filter === "products";
  const wantCustomers = filter === "all" || filter === "customers";
  const wantSuppliers = filter === "all" || filter === "suppliers";
  const wantWarehouses = filter === "all" || filter === "warehouses";
  const wantEmployees = filter === "all" || filter === "employees";
  const wantSales = filter === "all" || filter === "sales";
  const wantPurchases = filter === "all" || filter === "purchases";
  const wantInvoices = filter === "all" || filter === "invoices";
  const wantReports =
    filter === "all" || filter === "reports" || filter === "settings";
  const wantNotifications = filter === "all";

  const empty: never[] = [];

  const [
    products,
    customers,
    suppliers,
    warehouses,
    units,
    employees,
    sales,
    purchases,
    invoices,
    notifications,
    brands,
    categories,
  ] = await Promise.all([
    wantProducts
      ? db.product.findMany({
          where: {
            companyId,
            active: true,
            deletedAt: null,
            OR: [
              ...orContains(["name", "sku", "barcode", "notes"], variants),
            ],
          },
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            currentStock: true,
            salePrice: true,
            purchasePrice: true,
            costPrice: true,
            image: true,
            notes: true,
            updatedAt: true,
            warehouseStocks: {
              take: 1,
              orderBy: { updatedAt: "desc" },
              select: {
                quantity: true,
                warehouse: { select: { name: true } },
              },
            },
            saleItems: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { createdAt: true },
            },
          },
          take: take * 2,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(empty),
    wantCustomers
      ? db.customer.findMany({
          where: {
            companyId,
            active: true,
            deletedAt: null,
            OR: [
              ...orContains(
                ["name", "code", "phone", "email", "address", "notes"],
                variants
              ),
            ],
          },
          select: {
            id: true,
            name: true,
            code: true,
            phone: true,
            email: true,
            address: true,
            notes: true,
            updatedAt: true,
          },
          take,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(empty),
    wantSuppliers
      ? db.supplier.findMany({
          where: {
            companyId,
            active: true,
            deletedAt: null,
            OR: [
              ...orContains(
                ["name", "code", "phone", "email", "address", "notes"],
                variants
              ),
            ],
          },
          select: {
            id: true,
            name: true,
            code: true,
            phone: true,
            email: true,
            address: true,
            notes: true,
            updatedAt: true,
          },
          take,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(empty),
    wantWarehouses
      ? db.warehouse.findMany({
          where: {
            companyId,
            active: true,
            deletedAt: null,
            OR: [...orContains(["name", "code", "address"], variants)],
          },
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            isMain: true,
            updatedAt: true,
          },
          take,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(empty),
    wantProducts
      ? db.unit.findMany({
          where: {
            companyId,
            active: true,
            deletedAt: null,
            OR: [...orContains(["name", "symbol"], variants)],
          },
          select: {
            id: true,
            name: true,
            symbol: true,
            updatedAt: true,
          },
          take: 4,
          orderBy: { name: "asc" },
        })
      : Promise.resolve(empty),
    wantEmployees
      ? db.employee.findMany({
          where: {
            companyId,
            status: { not: "INACTIVE" },
            deletedAt: null,
            OR: [
              ...orContains(
                [
                  "fullName",
                  "username",
                  "phone",
                  "email",
                  "nationalId",
                  "position",
                  "department",
                ],
                variants
              ),
            ],
          },
          select: {
            id: true,
            fullName: true,
            username: true,
            department: true,
            position: true,
            status: true,
            phone: true,
            email: true,
            updatedAt: true,
          },
          take,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(empty),
    wantSales
      ? db.sale.findMany({
          where: {
            companyId,
            status: { not: "CANCELLED" },
            OR: [
              { invoiceNo: contains(primary) },
              { customer: { name: contains(primary) } },
              { notes: contains(primary) },
            ],
          },
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            total: true,
            notes: true,
            updatedAt: true,
            customer: { select: { name: true } },
            warehouse: { select: { name: true } },
            invoice: { select: { id: true } },
          },
          take,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(empty),
    wantPurchases
      ? db.purchase.findMany({
          where: {
            companyId,
            status: { not: "CANCELLED" },
            OR: [
              { invoiceNo: contains(primary) },
              { supplier: { name: contains(primary) } },
              { notes: contains(primary) },
            ],
          },
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            total: true,
            notes: true,
            updatedAt: true,
            supplier: { select: { name: true } },
            warehouse: { select: { name: true } },
          },
          take,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(empty),
    wantInvoices
      ? db.invoice.findMany({
          where: {
            companyId,
            status: { not: "VOID" },
            OR: [
              { invoiceNo: contains(primary) },
              { customerName: contains(primary) },
              { warehouseName: contains(primary) },
              { customerPhone: contains(primary) },
              { customerEmail: contains(primary) },
            ],
          },
          select: {
            id: true,
            invoiceNo: true,
            customerName: true,
            warehouseName: true,
            status: true,
            grandTotal: true,
            updatedAt: true,
          },
          take,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(empty),
    wantNotifications
      ? db.notification.findMany({
          where: {
            companyId,
            deletedAt: null,
            OR: [{ title: contains(primary) }, { message: contains(primary) }],
          },
          select: {
            id: true,
            title: true,
            message: true,
            href: true,
            createdAt: true,
          },
          take: 4,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(empty),
    wantProducts
      ? db.brand.findMany({
          where: {
            companyId,
            active: true,
            deletedAt: null,
            name: contains(primary),
          },
          select: { id: true, name: true, updatedAt: true },
          take: 4,
        })
      : Promise.resolve(empty),
    wantProducts
      ? db.category.findMany({
          where: {
            companyId,
            active: true,
            deletedAt: null,
            OR: [
              { name: contains(primary) },
              { description: contains(primary) },
            ],
          },
          select: {
            id: true,
            name: true,
            description: true,
            updatedAt: true,
          },
          take: 4,
        })
      : Promise.resolve(empty),
  ]);

  // Fuzzy re-rank products (typo tolerance beyond SQL contains)
  const rankedProducts = products
    .map((p) => ({
      p,
      score: fuzzyMatchFields(q, [p.name, p.sku, p.barcode, p.notes]),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((x) => x.p);

  const catalogHits = wantReports
    ? matchCatalog(
        q,
        filter === "settings"
          ? "settings"
          : filter === "reports"
            ? "reports"
            : undefined
      )
    : [];

  const productHits: SearchHit[] = rankedProducts.map((p) => {
    const type = productHitType(q, p);
    const wh = p.warehouseStocks[0]?.warehouse?.name || null;
    const lastSale = p.saleItems[0]?.createdAt
      ? p.saleItems[0].createdAt.toISOString()
      : null;
    const exact =
      (p.barcode && p.barcode.toLowerCase() === q.toLowerCase()) ||
      p.sku.toLowerCase() === q.toLowerCase();
    return {
      id: p.id,
      title: p.name,
      subtitle: [`SKU ${p.sku}`, wh || null, `Stock ${Number(p.currentStock)}`]
        .filter(Boolean)
        .join(" · "),
      description: p.notes?.slice(0, 120) || undefined,
      href: `/dashboard/products/${p.id}`,
      editHref: `/dashboard/products/${p.id}/edit`,
      type,
      module: "بەرهەمەکان",
      updatedAt: p.updatedAt.getTime(),
      exactMatch: exact,
      preview: {
        image: p.image,
        stock: Number(p.currentStock),
        warehouse: wh,
        salePrice: Number(p.salePrice),
        purchaseCost: Number(p.purchasePrice || p.costPrice),
        lastSale,
        notes: p.notes,
        extras: [
          { label: "SKU", value: p.sku },
          ...(p.barcode ? [{ label: "بارکۆد", value: p.barcode }] : []),
        ],
      },
    };
  });

  const skuHits = productHits.filter((h) => h.type === "sku");
  const barcodeHits = productHits.filter((h) => h.type === "barcode");
  const namedProducts = productHits.filter((h) => h.type === "product");

  const groups: SearchGroup[] = [];

  if (catalogHits.length) {
    pushGroup(
      groups,
      filter === "settings" ? "settings" : "modules",
      filter === "settings" ? "ڕێکخستنەکان" : "Pages / Reports / Tools",
      catalogHits.slice(0, 10)
    );
  }

  if (wantProducts) {
    pushGroup(groups, "products", "بەرهەمەکان", namedProducts);
    pushGroup(groups, "sku", "SKU", skuHits);
    pushGroup(groups, "barcode", "بارکۆد", barcodeHits);
    pushGroup(
      groups,
      "categories",
      "پۆلەکان",
      categories.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.description || "Category",
        href: `/dashboard/category/${c.id}/edit`,
        editHref: `/dashboard/category/${c.id}/edit`,
        type: "product",
        module: "بەرهەمەکان",
        updatedAt: c.updatedAt.getTime(),
      }))
    );
    pushGroup(
      groups,
      "brands",
      "براندەکان",
      brands.map((b) => ({
        id: b.id,
        title: b.name,
        subtitle: "Brand",
        href: `/dashboard/brands/${b.id}/edit`,
        editHref: `/dashboard/brands/${b.id}/edit`,
        type: "product",
        module: "بەرهەمەکان",
        updatedAt: b.updatedAt.getTime(),
      }))
    );
  }

  if (wantCustomers) {
    pushGroup(
      groups,
      "customers",
      "کڕیارەکان",
      customers.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: [c.code, c.phone, c.email].filter(Boolean).join(" · "),
        description: c.address || c.notes || undefined,
        href: `/dashboard/customers/${c.id}/edit`,
        editHref: `/dashboard/customers/${c.id}/edit`,
        type: "customer",
        module: "کڕیارەکان",
        updatedAt: c.updatedAt.getTime(),
        preview: {
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          extras: [
            { label: "Code", value: c.code },
            ...(c.address ? [{ label: "Address", value: c.address }] : []),
          ],
        },
      }))
    );
  }

  if (wantSuppliers) {
    pushGroup(
      groups,
      "suppliers",
      "دابینکەران",
      suppliers.map((s) => ({
        id: s.id,
        title: s.name,
        subtitle: [s.code, s.phone, s.email].filter(Boolean).join(" · "),
        description: s.address || s.notes || undefined,
        href: `/dashboard/suppliers/${s.id}/edit`,
        editHref: `/dashboard/suppliers/${s.id}/edit`,
        type: "supplier",
        module: "دابینکەران",
        updatedAt: s.updatedAt.getTime(),
        preview: {
          phone: s.phone,
          email: s.email,
          notes: s.notes,
          extras: [
            { label: "Code", value: s.code },
            ...(s.address ? [{ label: "Address", value: s.address }] : []),
          ],
        },
      }))
    );
  }

  if (wantInvoices) {
    pushGroup(
      groups,
      "invoices",
      "پسوولەکان",
      invoices.map((inv) => ({
        id: inv.id,
        title: inv.invoiceNo,
        subtitle: `${inv.customerName} · ${inv.warehouseName}`,
        description: `${Number(inv.grandTotal).toLocaleString()} IQD · ${inv.status}`,
        href: `/dashboard/invoices/${inv.id}`,
        type: "invoice",
        module: "پسوولەکان",
        updatedAt: inv.updatedAt.getTime(),
        preview: {
          status: inv.status,
          total: Number(inv.grandTotal),
          currency: "IQD",
          warehouse: inv.warehouseName,
          extras: [{ label: "کڕیار", value: inv.customerName }],
        },
      }))
    );
  }

  if (wantSales) {
    pushGroup(
      groups,
      "sales",
      "فرۆشتن",
      sales.map((s) => ({
        id: s.id,
        title: s.invoiceNo,
        subtitle: `${s.customer.name} · ${s.warehouse.name}`,
        description: `${Number(s.total).toLocaleString()} · ${s.status}`,
        href: s.invoice?.id
          ? `/dashboard/invoices/${s.invoice.id}`
          : `/dashboard/sales/${s.id}`,
        type: "sale",
        module: "فرۆشتن",
        updatedAt: s.updatedAt.getTime(),
        preview: {
          status: s.status,
          total: Number(s.total),
          warehouse: s.warehouse.name,
          notes: s.notes,
        },
      }))
    );
  }

  if (wantPurchases) {
    pushGroup(
      groups,
      "purchases",
      "کڕین",
      purchases.map((p) => ({
        id: p.id,
        title: p.invoiceNo,
        subtitle: `${p.supplier.name} · ${p.warehouse.name}`,
        description: `${Number(p.total).toLocaleString()} · ${p.status}`,
        href: `/dashboard/purchases/${p.id}`,
        type: "purchase",
        module: "کڕین",
        updatedAt: p.updatedAt.getTime(),
        preview: {
          status: p.status,
          total: Number(p.total),
          warehouse: p.warehouse.name,
          notes: p.notes,
        },
      }))
    );
  }

  if (wantWarehouses) {
    pushGroup(
      groups,
      "warehouses",
      "کۆگاکان",
      warehouses.map((w) => ({
        id: w.id,
        title: w.name,
        subtitle: [w.code, w.isMain ? "Main" : null, w.address]
          .filter(Boolean)
          .join(" · "),
        href: `/dashboard/werehouse/${w.id}`,
        editHref: `/dashboard/werehouse/${w.id}`,
        type: "warehouse",
        module: "کۆگاکان",
        updatedAt: w.updatedAt.getTime(),
        preview: {
          warehouse: w.name,
          extras: [
            { label: "Code", value: w.code },
            ...(w.address ? [{ label: "Address", value: w.address }] : []),
          ],
        },
      }))
    );
  }

  if (wantProducts) {
    pushGroup(
      groups,
      "units",
      "یەکەکان",
      units.map((u) => ({
        id: u.id,
        title: u.name,
        subtitle: u.symbol,
        href: `/dashboard/units/${u.id}/edit`,
        editHref: `/dashboard/units/${u.id}/edit`,
        type: "unit",
        module: "بەرهەمەکان",
        updatedAt: u.updatedAt.getTime(),
      }))
    );
  }

  if (wantEmployees) {
    pushGroup(
      groups,
      "employees",
      "کارمەندان",
      employees.map((e) => ({
        id: e.id,
        title: e.fullName,
        subtitle: [e.username, e.department, e.position]
          .filter(Boolean)
          .join(" · "),
        href: `/dashboard/employees/${e.id}`,
        editHref: `/dashboard/employees/${e.id}`,
        type: "employee",
        module: "کارمەندان",
        updatedAt: e.updatedAt.getTime(),
        preview: {
          phone: e.phone,
          email: e.email,
          status: e.status,
          extras: [
            ...(e.department
              ? [{ label: "Department", value: e.department }]
              : []),
            ...(e.position ? [{ label: "Position", value: e.position }] : []),
          ],
        },
      }))
    );
  }

  if (wantNotifications) {
    pushGroup(
      groups,
      "notifications",
      "ئاگادارییەکان",
      notifications.map((n) => ({
        id: n.id,
        title: n.title,
        subtitle: n.message.slice(0, 90),
        href: n.href || "/dashboard/notifications",
        type: "notification",
        module: "ئاگادارییەکان",
        updatedAt: n.createdAt.getTime(),
      }))
    );
  }

  if (groups.length === 0) {
    pushGroup(groups, "suggest", "Suggestions", [
      {
        id: "suggest-products",
        title: "بەرهەمەکان",
        subtitle: "Browse catalog",
        href: "/dashboard/products",
        type: "product",
        module: "بەرهەمەکان",
      },
      {
        id: "suggest-customers",
        title: "کڕیارەکان",
        href: "/dashboard/customers",
        type: "customer",
        module: "کڕیارەکان",
      },
      {
        id: "suggest-invoices",
        title: "پسوولەکان",
        href: "/dashboard/invoices",
        type: "invoice",
        module: "پسوولەکان",
      },
      {
        id: "suggest-reports",
        title: "ڕاپۆرتەکان",
        href: "/dashboard/reports",
        type: "reports",
        module: "ڕاپۆرتەکان",
      },
    ]);
  }

  if (!exactHref) {
    const exactHit = productHits.find((h) => h.exactMatch);
    if (exactHit) exactHref = exactHit.href;
  }

  const total = groups.reduce((sum, g) => sum + g.items.length, 0);
  return { query: q, groups, total, exactHref };
}

/** Compact index for offline / fuzzy client search */
export async function buildSearchIndex(companyId: string): Promise<SearchHit[]> {
  const take = 120;
  const [products, customers, suppliers, warehouses, employees, invoices] =
    await Promise.all([
      db.product.findMany({
        where: { companyId, active: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          currentStock: true,
          updatedAt: true,
        },
        take,
        orderBy: { updatedAt: "desc" },
      }),
      db.customer.findMany({
        where: { companyId, active: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          code: true,
          phone: true,
          email: true,
          updatedAt: true,
        },
        take,
        orderBy: { updatedAt: "desc" },
      }),
      db.supplier.findMany({
        where: { companyId, active: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          code: true,
          phone: true,
          updatedAt: true,
        },
        take,
        orderBy: { updatedAt: "desc" },
      }),
      db.warehouse.findMany({
        where: { companyId, active: true, deletedAt: null },
        select: { id: true, name: true, code: true, updatedAt: true },
        take: 60,
        orderBy: { updatedAt: "desc" },
      }),
      db.employee.findMany({
        where: { companyId, status: { not: "INACTIVE" }, deletedAt: null },
        select: {
          id: true,
          fullName: true,
          username: true,
          updatedAt: true,
        },
        take: 80,
        orderBy: { updatedAt: "desc" },
      }),
      db.invoice.findMany({
        where: { companyId, status: { not: "VOID" } },
        select: {
          id: true,
          invoiceNo: true,
          customerName: true,
          updatedAt: true,
        },
        take: 80,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  const items: SearchHit[] = [
    ...products.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `SKU ${p.sku}${p.barcode ? ` · ${p.barcode}` : ""}`,
      href: `/dashboard/products/${p.id}`,
      editHref: `/dashboard/products/${p.id}/edit`,
      type: "product",
      module: "بەرهەمەکان",
      updatedAt: p.updatedAt.getTime(),
      description: String(p.currentStock),
    })),
    ...customers.map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: [c.code, c.phone, c.email].filter(Boolean).join(" · "),
      href: `/dashboard/customers/${c.id}/edit`,
      editHref: `/dashboard/customers/${c.id}/edit`,
      type: "customer",
      module: "کڕیارەکان",
      updatedAt: c.updatedAt.getTime(),
    })),
    ...suppliers.map((s) => ({
      id: s.id,
      title: s.name,
      subtitle: [s.code, s.phone].filter(Boolean).join(" · "),
      href: `/dashboard/suppliers/${s.id}/edit`,
      editHref: `/dashboard/suppliers/${s.id}/edit`,
      type: "supplier",
      module: "دابینکەران",
      updatedAt: s.updatedAt.getTime(),
    })),
    ...warehouses.map((w) => ({
      id: w.id,
      title: w.name,
      subtitle: w.code,
      href: `/dashboard/werehouse/${w.id}`,
      type: "warehouse",
      module: "کۆگاکان",
      updatedAt: w.updatedAt.getTime(),
    })),
    ...employees.map((e) => ({
      id: e.id,
      title: e.fullName,
      subtitle: e.username,
      href: `/dashboard/employees/${e.id}`,
      type: "employee",
      module: "کارمەندان",
      updatedAt: e.updatedAt.getTime(),
    })),
    ...invoices.map((inv) => ({
      id: inv.id,
      title: inv.invoiceNo,
      subtitle: inv.customerName,
      href: `/dashboard/invoices/${inv.id}`,
      type: "invoice",
      module: "پسوولەکان",
      updatedAt: inv.updatedAt.getTime(),
    })),
  ];

  return items;
}
