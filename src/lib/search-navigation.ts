export type SearchParams = Record<string, string | undefined>;

export const legacyCategories: Record<string, string> = {
  tools: "home",
  "hand-tools": "power-tools",
  fitness: "outdoors",
};

export function searchUrl(params: SearchParams, changes: SearchParams = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value) query.set(key, value);
  }
  return `/search${query.size ? `?${query}` : ""}`;
}

export function categoryUrl(params: SearchParams, category?: string) {
  return searchUrl(params, {
    category,
    page: undefined,
    attribute: undefined,
    value: undefined,
  });
}
