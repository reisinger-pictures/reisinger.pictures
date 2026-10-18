import { describe, expect, it } from "vitest";

import { INITIAL_TFP_IDEA_COUNT, sortTfpIdeas, splitTfpIdeas } from "./tfp-ideas";

const withPriority = (id: string, priority: number) => ({ id, data: { priority } });

describe("sortTfpIdeas", () => {
  it("orders ideas by descending priority", () => {
    const ideas = [withPriority("low", 100), withPriority("high", 800), withPriority("mid", 400)];

    expect(sortTfpIdeas(ideas).map(idea => idea.id)).toEqual(["high", "mid", "low"]);
  });

  it("keeps the incoming order for equal priorities", () => {
    const ideas = [
      withPriority("first", 450),
      withPriority("second", 450),
      withPriority("third", 450)
    ];

    expect(sortTfpIdeas(ideas).map(idea => idea.id)).toEqual(["first", "second", "third"]);
  });

  it("does not mutate the input", () => {
    const ideas = [withPriority("low", 100), withPriority("high", 800)];

    sortTfpIdeas(ideas);

    expect(ideas.map(idea => idea.id)).toEqual(["low", "high"]);
  });
});

describe("splitTfpIdeas", () => {
  it("shows six ideas and hides the rest when there are more than six", () => {
    const ideas = Array.from({ length: 10 }, (_, index) => withPriority(`idea-${index}`, 10 - index));

    const { initial, remaining } = splitTfpIdeas(ideas);

    expect(initial).toHaveLength(INITIAL_TFP_IDEA_COUNT);
    expect(remaining).toHaveLength(4);
    expect(initial.map(idea => idea.id)).toEqual([
      "idea-0",
      "idea-1",
      "idea-2",
      "idea-3",
      "idea-4",
      "idea-5"
    ]);
    expect(remaining.map(idea => idea.id)).toEqual(["idea-6", "idea-7", "idea-8", "idea-9"]);
    expect([...initial, ...remaining].map(idea => idea.id)).toEqual(ideas.map(idea => idea.id));
  });

  it("hides nothing when there are exactly six ideas", () => {
    const ideas = Array.from({ length: INITIAL_TFP_IDEA_COUNT }, (_, index) => withPriority(`idea-${index}`, index));

    const { initial, remaining } = splitTfpIdeas(ideas);

    expect(initial).toHaveLength(INITIAL_TFP_IDEA_COUNT);
    expect(remaining).toEqual([]);
  });

  it("hides nothing when there are fewer than six ideas", () => {
    const ideas = [withPriority("only", 100)];

    const { initial, remaining } = splitTfpIdeas(ideas);

    expect(initial).toEqual(ideas);
    expect(remaining).toEqual([]);
  });

  it("returns two empty lists for no ideas at all", () => {
    expect(splitTfpIdeas([])).toEqual({ initial: [], remaining: [] });
  });

  it("honours a custom initial count", () => {
    const ideas = Array.from({ length: 5 }, (_, index) => withPriority(`idea-${index}`, index));

    const { initial, remaining } = splitTfpIdeas(ideas, 2);

    expect(initial.map(idea => idea.id)).toEqual(["idea-0", "idea-1"]);
    expect(remaining.map(idea => idea.id)).toEqual(["idea-2", "idea-3", "idea-4"]);
  });
});
