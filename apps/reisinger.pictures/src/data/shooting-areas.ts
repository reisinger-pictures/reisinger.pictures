/**
 * Pure logic for the shooting area pages.
 *
 * The former single `areas` collection is split into two collections
 * (`privateAreas` for Akt/Beauty/Pärchen and `sportAreas` for `sport` plus every
 * `sport/<sub-area>`), but all pages keep the exact same
 * `/shootings/<area-id>/` URLs. Nothing here changes content or routing: it only
 * derives the portfolio prefix used for the "Aktuelle Einblicke" related posts
 * and provides a deterministic ordering for the private offers.
 *
 * See `rules/09-shooting-areas.md`.
 */

/**
 * Areas whose portfolio prefix is a direct 1:1 mapping.
 * Values equal the portfolio content id prefix, not the area id.
 */
const DIRECT_PORTFOLIO_PREFIX: Record<string, string> = {
  akt: "akt",
  beauty: "beauty",
  sport: "sport",
  "sport/american-football": "sport",
  "sport/basketball": "sport",
  "sport/eishockey": "sport/eishockey/ice",
  "sport/fussball": "sport/fussball",
  "sport/volleyball": "sport"
};

/** Sport team areas that point at a more specific portfolio hub. */
const SPORT_TEAM_PORTFOLIO_PREFIX: Record<string, string> = {
  "sport/bwl": "sport/eishockey/ice",
  "sport/swl": "sport/eishockey/ice",
  "sport/lask": "sport/fussball/bundesliga",
  "sport/oefb": "sport/fussball",
  "sport/skv": "sport/fussball",
  "sport/dragons": "sport",
  "sport/vikings": "sport",
  "sport/acsl": "sport",
  "sport/steelvolleys": "sport"
};

/**
 * Maps an area id to the portfolio id prefix whose posts belong to it.
 * Unmapped non-sport areas fall back to their own id; every unmapped sport
 * sub-area falls back to the general `sport` hub.
 */
export function getPortfolioPrefix(areaId: string): string | null {
  if (areaId in DIRECT_PORTFOLIO_PREFIX) return DIRECT_PORTFOLIO_PREFIX[areaId];
  if (areaId in SPORT_TEAM_PORTFOLIO_PREFIX) return SPORT_TEAM_PORTFOLIO_PREFIX[areaId];
  if (areaId.startsWith("sport/")) return "sport";
  return areaId;
}

type DatedPost = {
  id: string;
  data: { date: Date };
};

/**
 * Newest-first selection of portfolio posts under a prefix. Preserves the
 * original filter (`prefix + "/"` or bare `prefix`), sort and 3-post limit.
 */
export function selectRelatedPosts<T extends DatedPost>(
  posts: readonly T[],
  prefix: string | null,
  limit = 3
): T[] {
  if (prefix === null || prefix === "") return [];
  return posts
    .filter((post) => post.id.startsWith(prefix + "/") || post.id.startsWith(prefix))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, limit);
}

type PrioritizedArea = {
  data: { priority: number };
};

/**
 * Descending `priority` order. `Array.prototype.sort` is stable, so areas that
 * share a priority keep the collection loader's deterministic id order and the
 * result never shuffles between builds.
 */
export function sortAreasByPriority<T extends PrioritizedArea>(areas: readonly T[]): T[] {
  return [...areas].sort((a, b) => b.data.priority - a.data.priority);
}
