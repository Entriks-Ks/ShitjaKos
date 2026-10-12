import { cities } from "@/lib/catalog";

const synonyms: Record<string, string[]> = {
  celular: ["telefon"],
  smartfon: ["telefon"],
  automobil: ["makine", "veture"],
  veture: ["makine", "automobil"],
  tesha: ["rroba"],
  veshmbathje: ["rroba"],
};

export function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("sq-AL")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function searchWords(value: string) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((word) => word.length > 1)
    .slice(0, 8);
}

export function expandSearchWords(words: string[]) {
  return [...new Set(words.flatMap((word) => [word, ...(synonyms[word] ?? [])]))];
}

export function parseNaturalSearch(value: string) {
  const normalized = normalizeSearchText(value);
  const result: Record<string, string | undefined> = {};
  const price = normalized.match(
    /(?:nen|deri|max|under|below)\s+(\d{1,8}(?:[.,]\d{1,2})?)/,
  );
  const range = normalized.match(
    /(?:nga|from)\s+(\d{1,8}(?:[.,]\d{1,2})?)\s+(?:deri|ne|max|to)\s+(\d{1,8}(?:[.,]\d{1,2})?)/,
  );
  if (range) {
    result.min = range[1].replace(",", ".");
    result.max = range[2].replace(",", ".");
  } else if (price) {
    if (/nen|under|below/.test(price[0])) result.max = price[1].replace(",", ".");
    else result.max = price[1].replace(",", ".");
  }

  const city = cities.find((candidate) =>
    new RegExp(`(?:^|\\s)${normalizeSearchText(candidate)}(?:$|\\s)`).test(normalized),
  );
  if (city) result.city = city;

  if (/\b(?:te reja|i ri|e re|new)\b/.test(normalized)) result.condition = "NEW";
  if (/\b(?:te perdorura|i perdorur|e perdorur|used)\b/.test(normalized))
    result.condition = "USED";
  return result;
}
