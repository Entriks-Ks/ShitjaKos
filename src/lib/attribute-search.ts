export const MAX_ATTRIBUTE_FILTERS = 64;

export type AttributeSearchFilter = {
  id: string;
  choice?: string;
  from?: number;
  to?: number;
};

const fieldKey = /^(field|from|to)_([a-zA-Z0-9_-]{1,100})$/;
const finiteNumber = /^-?\d{1,10}(?:\.\d{1,4})?$/;

export function attributeFilterKey(key: string) {
  const match = fieldKey.exec(key);
  return match ? { kind: match[1] as "field" | "from" | "to", id: match[2] } : null;
}

export function attributeFilterEntries(params: Record<string, string | undefined>) {
  return Object.entries(params).filter(
    ([key, value]) => attributeFilterKey(key) && value,
  );
}

export function parseAttributeFilters(params: Record<string, string | undefined>) {
  const entries = attributeFilterEntries(params);
  if (entries.length > MAX_ATTRIBUTE_FILTERS * 3) return [];
  const byId = new Map<string, AttributeSearchFilter>();
  for (const [key, raw] of entries) {
    const parsed = attributeFilterKey(key)!;
    if (!byId.has(parsed.id) && byId.size >= MAX_ATTRIBUTE_FILTERS) return [];
    const filter = byId.get(parsed.id) ?? { id: parsed.id };
    if (parsed.kind === "field") {
      if (raw!.length > 200) return [];
      filter.choice = raw;
    } else {
      if (!finiteNumber.test(raw!)) return [];
      const number = Number(raw);
      if (!Number.isFinite(number)) return [];
      filter[parsed.kind] = number;
    }
    byId.set(parsed.id, filter);
  }
  return [...byId.values()];
}
