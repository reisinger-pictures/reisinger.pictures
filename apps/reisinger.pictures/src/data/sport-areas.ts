/**
 * Pure data and ordering for the sport overview's art grid (the 5 art hubs) and
 * its grouped team/league directory (their 9 child pages).
 *
 * Owner decision D1 (`rules/11-sport-area-redesign-proposal.md` §8) chose this
 * small, unit-tested map over a new `parent` frontmatter field, so no sport
 * entry carries a parent relation. The overview MDX mounts the directory
 * component; no sport-entry metadata or prose is rewritten. The map names
 * existing area ids only: every id already has a `/shootings/<id>/` route, so no
 * URL is derived, renamed or invented here.
 *
 * Ordering uses existing `priority` values in ascending order to preserve the
 * overview and hub-link order that visitors already see. `acsl`, `swl` and
 * `steelvolleys` carry no `priority` in the content; `shootingAreaSchema` fills
 * an absent value with the `9999` sentinel, which this module treats as
 * "unranked" and places after ranked entries (declaration order decides among
 * unranked entries).
 */

/**
 * `shootingAreaSchema` (`src/content.config.ts`) defaults an absent `priority`
 * to `9999`. No sport entry sets that value explicitly, so it doubles as the
 * "no content priority" sentinel for the three unranked entries.
 */
export const UNSET_PRIORITY = 9999;

/** The five art hubs, in declaration order (the sort below is authoritative). */
export const SPORT_ART_HUBS = [
  "sport/american-football",
  "sport/basketball",
  "sport/eishockey",
  "sport/fussball",
  "sport/volleyball"
] as const;

export type SportArtHubId = (typeof SPORT_ART_HUBS)[number];

/**
 * Art hub → its child team/league pages. Membership only; the display order is
 * derived from `priority` by `orderSportAreas`, with this declaration order as
 * the deterministic fallback for the unranked entries.
 *
 * `sport/acsl` is assigned to Basketball once. The American-Football hub body
 * also links it, but the binding map keeps a single owner.
 */
export const SPORT_CHILDREN: Record<SportArtHubId, readonly string[]> = {
  "sport/american-football": ["sport/dragons", "sport/vikings"],
  "sport/basketball": ["sport/acsl"],
  "sport/eishockey": ["sport/bwl", "sport/swl"],
  "sport/fussball": ["sport/lask", "sport/oefb", "sport/skv"],
  "sport/volleyball": ["sport/steelvolleys"]
};

/** Every child id in one flat list (9 ids), for coverage checks. */
export function sportChildIds(): string[] {
  return SPORT_ART_HUBS.flatMap((hub) => SPORT_CHILDREN[hub]);
}

type Prioritized = {
  data: { priority: number };
};

/**
 * Ascending `priority` preserves the order already visible in the overview and
 * hub body links. The schema's unset sentinel ranks last; unranked entries keep
 * the caller's declaration order. The input is not mutated.
 */
export function orderSportAreas<T extends Prioritized>(areas: readonly T[]): T[] {
  const ranked = areas.filter((area) => area.data.priority !== UNSET_PRIORITY);
  const unranked = areas.filter((area) => area.data.priority === UNSET_PRIORITY);
  return [...ranked.sort((a, b) => a.data.priority - b.data.priority), ...unranked];
}

type SportAreaLike = Prioritized & { id: string };

/** An art hub together with the child pages assigned to it by the map. */
export type SportOverviewGroup<T> = {
  hub: T;
  children: T[];
};

/**
 * Groups the collection entries into the overview's display order: the 5 art
 * hubs ordered by `priority`, each followed by its mapped children, also ordered
 * by `priority`. Entries not named by the map are ignored, and a mapped id with
 * no matching entry is skipped, so a stale map cannot crash the page.
 */
export function groupSportAreas<T extends SportAreaLike>(areas: readonly T[]): SportOverviewGroup<T>[] {
  const byId = new Map(areas.map((area) => [area.id, area]));

  return orderSportAreas(
    SPORT_ART_HUBS.flatMap((hubId) => {
      const hub = byId.get(hubId);
      return hub === undefined ? [] : [hub];
    })
  ).map((hub) => ({
    hub,
    children: orderSportAreas(
      SPORT_CHILDREN[hub.id as SportArtHubId].flatMap((childId) => {
        const child = byId.get(childId);
        return child === undefined ? [] : [child];
      })
    )
  }));
}

/** Collection item ids for the overview or one art hub, following directory order. */
export function sportCollectionIds<T extends SportAreaLike>(areas: readonly T[], pageId: string): string[] {
  const groups = groupSportAreas(areas);
  if (pageId === "sport") {
    return groups.flatMap(({ hub, children }) => [hub.id, ...children.map((child) => child.id)]);
  }
  return groups.find(({ hub }) => hub.id === pageId)?.children.map((child) => child.id) ?? [];
}
