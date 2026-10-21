export const MAX_ATTRIBUTE_FILTERS = 64;

export type AttributeSearchFilter = {
  id: string;
  choice?: string;
  choices?: string[];
  from?: number;
  to?: number;
};

const fieldKey = /^(field|choices|from|to)_([a-zA-Z0-9_-]{1,100})$/;
const finiteNumber = /^-?\d{1,10}(?:\.\d{1,4})?$/;

export function attributeFilterKey(key: string) {
  const match = fieldKey.exec(key);
  return match
    ? { kind: match[1] as "field" | "choices" | "from" | "to", id: match[2] }
    : null;
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
    if (parsed.kind === "choices") {
      const choices = decodeFilterChoices(raw!);
      if (!choices.length || filter.choice !== undefined) return [];
      filter.choices = choices;
    } else if (parsed.kind === "field") {
      if (filter.choices) return [];
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

export function decodeFilterChoices(raw: string): string[] {
  if (raw.length > 10400) return [];
  try {
    const values: unknown = JSON.parse(raw);
    if (
      !Array.isArray(values) ||
      !values.length ||
      values.length > 50 ||
      !values.every(
        (value) => typeof value === "string" && value.length > 0 && value.length <= 200,
      )
    )
      return [];
    return [...new Set(values as string[])].sort();
  } catch {
    return [];
  }
}
