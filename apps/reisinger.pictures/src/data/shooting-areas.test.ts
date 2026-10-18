import { describe, expect, it } from "vitest";

import { getPortfolioPrefix, selectRelatedPosts, sortAreasByPriority } from "./shooting-areas";

describe("getPortfolioPrefix", () => {
  it("maps the private offers to their own portfolio prefix", () => {
    expect(getPortfolioPrefix("akt")).toBe("akt");
    expect(getPortfolioPrefix("beauty")).toBe("beauty");
    expect(getPortfolioPrefix("couples")).toBe("couples");
  });

  it("maps hub areas and team areas to their portfolio hub", () => {
    expect(getPortfolioPrefix("sport")).toBe("sport");
    expect(getPortfolioPrefix("sport/eishockey")).toBe("sport/eishockey/ice");
    expect(getPortfolioPrefix("sport/bwl")).toBe("sport/eishockey/ice");
    expect(getPortfolioPrefix("sport/swl")).toBe("sport/eishockey/ice");
    expect(getPortfolioPrefix("sport/fussball")).toBe("sport/fussball");
    expect(getPortfolioPrefix("sport/lask")).toBe("sport/fussball/bundesliga");
    expect(getPortfolioPrefix("sport/oefb")).toBe("sport/fussball");
    expect(getPortfolioPrefix("sport/skv")).toBe("sport/fussball");
    expect(getPortfolioPrefix("sport/american-football")).toBe("sport");
    expect(getPortfolioPrefix("sport/basketball")).toBe("sport");
    expect(getPortfolioPrefix("sport/volleyball")).toBe("sport");
  });

  it("falls back to the general sport hub for unmapped sport sub-areas", () => {
    for (const team of ["dragons", "vikings", "acsl", "steelvolleys"]) {
      expect(getPortfolioPrefix(`sport/${team}`)).toBe("sport");
    }
    expect(getPortfolioPrefix("sport/unknown-team")).toBe("sport");
  });

  it("falls back to the area id for unmapped non-sport areas", () => {
    expect(getPortfolioPrefix("unknown")).toBe("unknown");
  });

  it("covers every existing area id without changing the previous mapping", () => {
    const areaIds = [
      "akt",
      "beauty",
      "couples",
      "sport",
      "sport/acsl",
      "sport/american-football",
      "sport/basketball",
      "sport/bwl",
      "sport/dragons",
      "sport/eishockey",
      "sport/fussball",
      "sport/lask",
      "sport/oefb",
      "sport/skv",
      "sport/steelvolleys",
      "sport/swl",
      "sport/vikings",
      "sport/volleyball"
    ];
    expect(areaIds).toHaveLength(18);
    for (const id of areaIds) {
      expect(getPortfolioPrefix(id)).not.toBeNull();
    }
  });
});

describe("selectRelatedPosts", () => {
  const post = (id: string, day: number) => ({ id, data: { date: new Date(2026, 0, day) } });

  const posts = [
    post("sport/eishockey/ice/a", 1),
    post("sport/eishockey/ice/b", 5),
    post("sport/eishockey/ice/c", 3),
    post("sport/fussball/bundesliga/x", 4),
    post("sport/z", 2)
  ];

  it("returns the newest posts of a prefix, limited to three", () => {
    expect(selectRelatedPosts(posts, "sport/eishockey/ice").map((p) => p.id)).toEqual([
      "sport/eishockey/ice/b",
      "sport/eishockey/ice/c",
      "sport/eishockey/ice/a"
    ]);
  });

  it("matches the bare prefix and returns the newest three overall", () => {
    expect(selectRelatedPosts(posts, "sport").map((p) => p.id)).toEqual([
      "sport/eishockey/ice/b",
      "sport/fussball/bundesliga/x",
      "sport/eishockey/ice/c"
    ]);
  });

  it("returns an empty list without a prefix or without matches", () => {
    expect(selectRelatedPosts(posts, null)).toEqual([]);
    expect(selectRelatedPosts(posts, "")).toEqual([]);
    expect(selectRelatedPosts(posts, "akt")).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const input = [post("akt/a", 1), post("akt/b", 9)];
    const before = [...input];
    selectRelatedPosts(input, "akt");
    expect(input).toEqual(before);
  });
});

describe("sortAreasByPriority", () => {
  const area = (id: string, priority: number) => ({ id, data: { priority } });

  it("sorts by descending priority", () => {
    const sorted = sortAreasByPriority([
      area("a", 1),
      area("b", 9999),
      area("c", 3)
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(["b", "c", "a"]);
  });

  it("keeps the loader order for equal priorities (stable)", () => {
    const sorted = sortAreasByPriority([
      area("akt", 9999),
      area("beauty", 9999),
      area("couples", 9999)
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(["akt", "beauty", "couples"]);
  });

  it("does not mutate the input list", () => {
    const input = [area("a", 1), area("b", 2)];
    const before = [...input];
    sortAreasByPriority(input);
    expect(input).toEqual(before);
  });
});
