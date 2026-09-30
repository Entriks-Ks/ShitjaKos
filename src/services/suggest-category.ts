import "server-only";

import { getCachedCategories } from "@/lib/catalog-cache";

type Leaf = {
  id: string;
  labels: string[];
  parent: string;
};

function words(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

async function catalogLeaves() {
  const categories = await getCachedCategories();
  return categories
    .filter((category) => category.parentId)
    .map((category) => {
      const parent = categories.find((row) => row.id === category.parentId);
      const labels = [
        ...category.translations.map((row) => row.name),
        ...(parent?.translations.map((row) => row.name) ?? []),
        category.slug.replaceAll("-", " "),
      ];
      return {
        id: category.id,
        labels,
        parent: parent?.translations.find((row) => row.locale === "en")?.name ?? "",
      } satisfies Leaf;
    });
}

function scoreLeaf(leaf: Leaf, text: string) {
  const haystack = ` ${text} `;
  let score = 0;
  for (const label of leaf.labels) {
    const tokens = words(label);
    const phrase = label.toLowerCase();
    if (phrase.length > 3 && haystack.includes(` ${phrase} `)) score += 8 + phrase.length;
    for (const token of tokens) {
      if (haystack.includes(` ${token} `)) score += token.length;
    }
  }
  return score;
}

async function suggestWithOpenAi(title: string, description: string, leaves: Leaf[]) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const catalog = leaves
    .map((leaf) => `${leaf.id} | ${leaf.parent} / ${leaf.labels[0] ?? leaf.id}`)
    .join("\n");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 40,
      messages: [
        {
          role: "system",
          content:
            "Pick the single best marketplace subcategory id for a listing. Reply with the id only.",
        },
        {
          role: "user",
          content: `Title: ${title}\nDescription: ${description}\n\nSubcategories:\n${catalog}`,
        },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
  const id = leaves.find((leaf) => raw.includes(leaf.id))?.id ?? null;
  return id;
}

export async function suggestCategoryFromListingText(title: string, description: string) {
  const text = `${title} ${description}`.trim();
  if (title.trim().length < 5 || description.trim().length < 20) return null;
  const leaves = await catalogLeaves();
  if (!leaves.length) return null;
  const fromModel = await suggestWithOpenAi(title.trim(), description.trim(), leaves);
  if (fromModel) return fromModel;
  const haystack = ` ${text.toLowerCase()} ${words(text).join(" ")} `;
  const ranked = leaves
    .map((leaf) => ({ id: leaf.id, score: scoreLeaf(leaf, haystack) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].id : null;
}
