/**
 * Pure logic for the shooting area pages.
 *
 * The former single `areas` collection is split into two collections
 * (`privateAreas` for Akt/Beauty/Pärchen and `sportAreas` for `sport` plus every
 * `sport/<sub-area>`), but all pages keep the exact same
 * `/shootings/<area-id>/` URLs. Nothing here changes content or routing: it only
 * derives the portfolio prefix used for the related posts, the D2 tag selection
 * for the four team areas that map to the broad `sport` bucket, and a
 * deterministic ordering for the private offers.
 *
 * See `rules/09-shooting-areas.md`.
 */

import { type PortfolioTag } from "./portfolio-tags";
import { SPORT_ART_HUBS } from "./sport-areas";

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
 * The four team/league areas whose only prefix is the broad `sport` bucket get
 * an explicit D2 tag instead (owner decision, `rules/11-sport-area-redesign-proposal.md`
 * §8). Each value equals its area id's team suffix and its `PortfolioTag`.
 * SteelVolleys currently has no tagged post, so its block can stay empty.
 */
const TEAM_PORTFOLIO_TAGS: Record<string, PortfolioTag> = {
  "sport/dragons": "dragons",
  "sport/vikings": "vikings",
  "sport/acsl": "acsl",
  "sport/steelvolleys": "steelvolleys"
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
  data: { date: Date; tags?: readonly string[] };
};

/** Newest-first copy of the matches, cut to `limit`; the input is not mutated. */
function newestFirst<T extends DatedPost>(posts: readonly T[], limit: number): T[] {
  return [...posts]
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, limit);
}

/**
 * Newest-first selection of portfolio posts. With an explicit `tag` (D2) only
 * posts whose `data.tags` contains that tag are eligible — the general `sport`
 * mix never leaks in and an untagged post is not selected. Without a tag the
 * original prefix filter (`prefix + "/"` or bare `prefix`), sort and 3-post
 * default limit are preserved.
 */
export function selectRelatedPosts<T extends DatedPost>(
  posts: readonly T[],
  prefix: string | null,
  limit = 3,
  tag?: PortfolioTag
): T[] {
  if (tag !== undefined) {
    const activeTag = tag;
    return newestFirst(
      posts.filter((post) => post.data.tags?.includes(activeTag) ?? false),
      limit
    );
  }
  if (prefix === null || prefix === "") return [];
  return newestFirst(
    posts.filter((post) => post.id.startsWith(prefix + "/") || post.id.startsWith(prefix)),
    limit
  );
}

/**
 * Related-post block configuration for one area page: how the posts are
 * selected (`prefix`, or the explicit D2 `tag`) and how the block presents them
 * (`heading`, `showDate`). The heading reuses the entry's existing `name`; no
 * wording is invented.
 */
export type RelatedPostsConfig = {
  prefix: string | null;
  /** When set, this tag replaces the prefix for the selection. */
  tag?: PortfolioTag;
  limit: number;
  heading: string;
  showDate: boolean;
};

/**
 * The sport overview shows six newest posts ("Neu im Sport"), the five art hubs
 * and the nine team pages show three each, and only the sport pages show the
 * publication date. Private offers keep the original block ("Aktuelle
 * Einblicke", no date, three prefix-selected posts).
 */
export function getRelatedPostsConfig(areaId: string, name: string): RelatedPostsConfig {
  const prefix = getPortfolioPrefix(areaId);
  if (areaId === "sport") {
    return { prefix, limit: 6, heading: "Neu im Sport", showDate: true };
  }
  const tag = TEAM_PORTFOLIO_TAGS[areaId];
  if (tag !== undefined) {
    return { prefix, tag, limit: 3, heading: `Neu bei ${name}`, showDate: true };
  }
  if (areaId.startsWith("sport/")) {
    const isArtHub = (SPORT_ART_HUBS as readonly string[]).includes(areaId);
    return {
      prefix,
      limit: 3,
      heading: isArtHub ? `Neu in ${name}` : `Neu bei ${name}`,
      showDate: true
    };
  }
  return { prefix, limit: 3, heading: "Aktuelle Einblicke", showDate: false };
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
