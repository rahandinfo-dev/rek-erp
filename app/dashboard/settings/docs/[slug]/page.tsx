import { getCurrentUser } from "@/lib/auth/current-user";
import { notFound, redirect } from "next/navigation";
import DocsModuleView from "@/components/docs/DocsModuleView";
import { ALL_DOC_MODULES, getDocModule } from "@/lib/docs/catalog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return ALL_DOC_MODULES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const mod = getDocModule(slug);
  if (!mod) return { title: "فێرکاری سیستەم" };
  return {
    title: `${mod.title} · فێرکاری سیستەم`,
    description: mod.shortDescription,
  };
}

export default async function DocsModulePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { slug } = await params;
  const mod = getDocModule(slug);
  if (!mod) notFound();

  const allSlugs = ALL_DOC_MODULES.map((m) => ({
    slug: m.slug,
    title: m.title,
  }));

  return <DocsModuleView module={mod} allSlugs={allSlugs} />;
}
