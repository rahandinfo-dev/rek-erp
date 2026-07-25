import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { listProductsPage } from "@/lib/products/list";
import ProductsBrowser from "@/components/products/ProductsBrowser";
import { redirect } from "next/navigation";

export default async function ProductsPage() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) redirect("/login");

  const initial = await listProductsPage({
    companyId,
    page: 1,
    pageSize: 12,
  });

  return (
    <ProductsBrowser
      initialProducts={initial.products}
      initialPagination={initial.pagination}
    />
  );
}
