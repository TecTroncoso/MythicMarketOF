"use server";

import { headers } from "next/headers";
import { getClientIp } from "@/lib/client-ip";
import { PRODUCTS, CATEGORY_LABELS, type ProductCategory } from "@/lib/catalog";
import { searchRateLimiter } from "@/lib/rate-limit";
import { getStoreProducts } from "@/lib/store-catalog";

export interface SearchResult {
  id: string;
  /** Display name ("78 Diamonds"). */
  name: string;
  /** Full label incl. bonus ("78 Diamonds + 8 Bonus"). */
  label: string;
  category: ProductCategory;
  categoryLabel: string;
  image: string;
}

const MAX_RESULTS = 6;

/**
 * Public storefront search: matches the LIVE catalog (supplier snapshot +
 * combos + per-item markups) — or the static catalog when no snapshot exists.
 * Rate-limited by IP like the MLBB lookup. Returns at most 6 hits for a
 * trimmed query; anything else gets an empty list (the UI just hides).
 */
export async function searchStore(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const h = await headers();
  const { success } = await searchRateLimiter.limit(getClientIp(h));
  if (!success) return [];

  const live = await getStoreProducts("mlbb");
  const pool: SearchResult[] = (live ?? PRODUCTS).map((p) => ({
    id: p.id,
    name: p.name,
    label: "label" in p ? p.label : `${p.name}${p.bonus ? ` + ${p.bonus}` : ""}`,
    category: p.category,
    categoryLabel: CATEGORY_LABELS[p.category],
    image: p.image,
  }));

  return pool
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q) ||
        p.category.includes(q)
    )
    .slice(0, MAX_RESULTS);
}
