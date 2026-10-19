/**
 * Controlled `tags` vocabulary for portfolio posts.
 *
 * Owner decision D2 (`rules/11-sport-area-redesign-proposal.md` §8) chose an
 * explicit, evidence-backed `tags` field over new portfolio prefixes, so the
 * four sport team pages that fall back to the general `sport` prefix — Dragons,
 * Vikings, ACSL and SteelVolleys — can select their own posts.
 *
 * Each value equals the suffix of its `/shootings/sport/<team>/` area id. This
 * list is the single source of truth: `src/content.config.ts` imports it for the
 * `portfolio` schema, so the enum is not duplicated. Step 7 reuses it for the
 * related-post filter.
 *
 * A tag is assigned to a post only when the post's own title, description or
 * body names the team or league — never inferred from sport, opponent, image
 * slugs or unrelated pages. A post without such evidence stays untagged. See
 * `rules/09-shooting-areas.md` and the project-local `blog-beitrag` skill.
 */
export const PORTFOLIO_TAGS = ["dragons", "vikings", "acsl", "steelvolleys"] as const;

export type PortfolioTag = (typeof PORTFOLIO_TAGS)[number];
