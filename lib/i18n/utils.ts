type Nested =
  | string
  | { [key: string]: Nested };

export type MessageTree = { [key: string]: Nested };

export type TranslateParams = Record<string, string | number | null | undefined>;

/** Flatten nested dictionaries into "a.b.c" keys. */
export function flattenMessages(
  tree: MessageTree,
  prefix = ""
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path] = value;
    } else if (value && typeof value === "object") {
      Object.assign(out, flattenMessages(value as MessageTree, path));
    }
  }
  return out;
}

/** Simple `{name}` interpolation. */
export function interpolate(template: string, params?: TranslateParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = params[key];
    return v == null ? "" : String(v);
  });
}
