/**
 * Presentation data for the TFP idea overview (`/tfp/`).
 *
 * Every entry of the `tfp` content collection is an *idea* for a possible
 * creative collaboration — a proposal, not a running offer. That is why there
 * is deliberately no lifecycle/status field and no active/archived
 * classification. The existing numeric `priority` from the frontmatter defines
 * the order (descending); ideas that share a priority keep the stable,
 * deterministic order of the collection loader (id order), because
 * `Array.prototype.sort` is stable.
 */

/** Number of ideas that are visible before the "Weitere Ideen" disclosure. */
export const INITIAL_TFP_IDEA_COUNT = 6;

type TfpIdea = {
  data: {
    priority: number;
  };
};

/** Sorts ideas by descending priority without mutating the input. */
export function sortTfpIdeas<T extends TfpIdea>(ideas: readonly T[]): T[] {
  return [...ideas].sort((a, b) => b.data.priority - a.data.priority);
}

/** Splits ideas into the initially visible ones and the collapsible rest. */
export function splitTfpIdeas<T>(
  ideas: readonly T[],
  initialCount: number = INITIAL_TFP_IDEA_COUNT
): { initial: T[]; remaining: T[] } {
  return {
    initial: ideas.slice(0, initialCount),
    remaining: ideas.slice(initialCount)
  };
}
