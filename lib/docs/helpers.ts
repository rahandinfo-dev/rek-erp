import type { DocModule, DocSectionKey } from "@/lib/docs/types";
import { DOC_SECTION_LABELS } from "@/lib/docs/types";

type SectionInput = Partial<Record<DocSectionKey, string[]>>;

export function defineDocModule(
  base: Omit<DocModule, "sections"> & { sections: SectionInput }
): DocModule {
  const sections = {} as DocModule["sections"];
  for (const key of Object.keys(DOC_SECTION_LABELS) as DocSectionKey[]) {
    sections[key] = {
      id: key,
      title: DOC_SECTION_LABELS[key],
      body: base.sections[key] ?? [],
    };
  }
  return { ...base, sections };
}
