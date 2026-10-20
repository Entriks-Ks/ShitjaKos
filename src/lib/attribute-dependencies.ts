// Shared catalog contract for web forms, search and mobile clients.
export type CatalogOption = {
  value: string;
  labels: Record<string, string>;
  parentValues?: string[];
};

export type DependentAttribute = {
  id: string;
  dependsOnId?: string | null;
  options: unknown;
};

export function catalogOptions(options: unknown): CatalogOption[] {
  return Array.isArray(options) ? (options as CatalogOption[]) : [];
}

export function availableOptions(
  field: DependentAttribute,
  values: Record<string, unknown>,
) {
  const options = catalogOptions(field.options);
  if (!field.dependsOnId) return options;
  const parent = values[field.dependsOnId];
  if (typeof parent !== "string" || !parent) return [];
  return options.filter((option) => option.parentValues?.includes(parent));
}

export function changeAttributeValue(
  fields: DependentAttribute[],
  values: Record<string, unknown>,
  id: string,
  value: unknown,
) {
  const next = { ...values, [id]: value };
  // Clear descendants as well, even if a future catalog introduces more levels.
  const changed = new Set([id]);
  for (let pass = 0; pass < fields.length; pass++) {
    let cleared = false;
    for (const field of fields) {
      if (field.dependsOnId && changed.has(field.dependsOnId) && !changed.has(field.id)) {
        delete next[field.id];
        changed.add(field.id);
        cleared = true;
      }
    }
    if (!cleared) break;
  }
  return next;
}

export function searchAttributeValues(
  fields: DependentAttribute[],
  params: Record<string, string | undefined>,
) {
  return Object.fromEntries(
    fields.map((field) => [
      field.id,
      params[`field_${field.id}`] ??
        (params.attribute === field.id ? params.value : "") ??
        "",
    ]),
  );
}
