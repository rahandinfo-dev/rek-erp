import { startModules } from "@/lib/docs/modules/start";
import { inventoryModules } from "@/lib/docs/modules/inventory";
import { tradingModules } from "@/lib/docs/modules/trading";
import { financeModules } from "@/lib/docs/modules/finance";
import { peopleModules } from "@/lib/docs/modules/people";
import { insightsModules } from "@/lib/docs/modules/insights";
import { aiModules } from "@/lib/docs/modules/ai";
import { systemModules } from "@/lib/docs/modules/system";
import type { DocModule } from "@/lib/docs/types";

export const ALL_DOC_MODULES: DocModule[] = [
  ...startModules,
  ...inventoryModules,
  ...tradingModules,
  ...financeModules,
  ...peopleModules,
  ...insightsModules,
  ...aiModules,
  ...systemModules,
];

const bySlug = new Map(ALL_DOC_MODULES.map((m) => [m.slug, m]));

export function getDocModule(slug: string): DocModule | undefined {
  return bySlug.get(slug);
}

export function getDocModulesByCategory(categoryId: string): DocModule[] {
  return ALL_DOC_MODULES.filter((m) => m.categoryId === categoryId);
}

export { ALL_DOC_MODULES as DOC_MODULES };
