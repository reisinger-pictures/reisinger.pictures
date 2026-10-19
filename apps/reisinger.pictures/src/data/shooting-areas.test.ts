import { describe, expect, it } from "vitest";

import { getPortfolioPrefix, getRelatedPostsConfig, selectRelatedPosts, sortAreasByPriority } from "./shooting-areas";

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

  const tagged = (id: string, day: number, tags: string[]) => ({
    id,
    data: { date: new Date(2026, 0, day), tags }
  });

  it("selects only posts carrying the explicit team tag (no prefix leakage)", () => {
    const mixed = [
      tagged("sport/football/afl/week-1-dragons-vikings", 1, ["dragons", "vikings"]),
      tagged("sport/football/afl/week-3-dragons-panthers", 5, ["dragons"]),
      tagged("sport/football/afle/week-4-vikings-rams", 3, ["vikings"]),
      post("sport/eishockey/ice/b", 9),
      post("sport/acsl/bees-astros", 8)
    ];
    expect(selectRelatedPosts(mixed, "sport", 3, "dragons").map((p) => p.id)).toEqual([
      "sport/football/afl/week-3-dragons-panthers",
      "sport/football/afl/week-1-dragons-vikings"
    ]);
  });

  it("returns a shared post for each of its tags", () => {
    const shared = [tagged("sport/football/afl/week-1-dragons-vikings", 1, ["dragons", "vikings"])];
    expect(selectRelatedPosts(shared, "sport", 3, "dragons")).toHaveLength(1);
    expect(selectRelatedPosts(shared, "sport", 3, "vikings")).toHaveLength(1);
  });

  it("never falls back to the prefix and skips untagged or missing tags", () => {
    const untagged = [post("sport/eishockey/ice/b", 9), post("sport/z", 8)];
    expect(selectRelatedPosts(untagged, "sport", 3, "dragons")).toEqual([]);
    // A tag that has no tagged post yet (SteelVolleys) yields an empty block.
    expect(selectRelatedPosts(untagged, "sport", 3, "steelvolleys")).toEqual([]);
  });

  it("sorts tag matches newest-first and honours the limit", () => {
    const many = [
      tagged("sport/football/afl/a", 1, ["dragons"]),
      tagged("sport/football/afl/b", 5, ["dragons"]),
      tagged("sport/football/afl/c", 3, ["dragons"]),
      tagged("sport/football/afl/d", 4, ["dragons"])
    ];
    expect(selectRelatedPosts(many, "sport", 2, "dragons").map((p) => p.id)).toEqual([
      "sport/football/afl/b",
      "sport/football/afl/d"
    ]);
  });

  it("does not mutate the input list when selecting by tag", () => {
    const input = [
      tagged("sport/football/afl/a", 1, ["dragons"]),
      tagged("sport/football/afl/b", 9, ["dragons"])
    ];
    const before = [...input];
    selectRelatedPosts(input, "sport", 3, "dragons");
    expect(input).toEqual(before);
  });
});

describe("getRelatedPostsConfig", () => {
  it("gives the sport overview six dated posts and the exact heading", () => {
    expect(getRelatedPostsConfig("sport", "Sportfotografie")).toEqual({
      prefix: "sport",
      limit: 6,
      heading: "Neu im Sport",
      showDate: true
    });
  });

  it("gives the five art hubs three dated posts and a 'Neu in <Sportart>' heading", () => {
    const hubs: [string, string, string][] = [
      ["sport/american-football", "American Football & Cheerleading", "sport"],
      ["sport/basketball", "Basketball", "sport"],
      ["sport/eishockey", "Eishockey", "sport/eishockey/ice"],
      ["sport/fussball", "Fußball", "sport/fussball"],
      ["sport/volleyball", "Volleyball", "sport"]
    ];
    for (const [id, name, prefix] of hubs) {
      expect(getRelatedPostsConfig(id, name)).toEqual({
        prefix,
        limit: 3,
        heading: `Neu in ${name}`,
        showDate: true
      });
    }
  });

  it("gives the five prefix-mapped team pages three dated posts and a 'Neu bei <Team>' heading", () => {
    const teams: [string, string, string][] = [
      ["sport/bwl", "BWL", "sport/eishockey/ice"],
      ["sport/swl", "SWL", "sport/eishockey/ice"],
      ["sport/lask", "LASK", "sport/fussball/bundesliga"],
      ["sport/oefb", "ÖFB", "sport/fussball"],
      ["sport/skv", "SKV", "sport/fussball"]
    ];
    for (const [id, name, prefix] of teams) {
      expect(getRelatedPostsConfig(id, name)).toEqual({
        prefix,
        limit: 3,
        heading: `Neu bei ${name}`,
        showDate: true
      });
    }
  });

  it("selects the four broad-prefix teams by their explicit tag only", () => {
    const teams: [string, string, string][] = [
      ["sport/dragons", "Dragons", "dragons"],
      ["sport/vikings", "Vikings", "vikings"],
      ["sport/acsl", "ACSL", "acsl"],
      ["sport/steelvolleys", "SteelVolleys", "steelvolleys"]
    ];
    for (const [id, name, tag] of teams) {
      expect(getRelatedPostsConfig(id, name)).toEqual({
        prefix: "sport",
        tag,
        limit: 3,
        heading: `Neu bei ${name}`,
        showDate: true
      });
    }
    // The other five team pages keep their narrower prefix and get no tag.
    expect(getRelatedPostsConfig("sport/bwl", "BWL").tag).toBeUndefined();
    expect(getRelatedPostsConfig("sport/lask", "LASK").tag).toBeUndefined();
  });

  it("keeps the private offers on the original block", () => {
    expect(getRelatedPostsConfig("akt", "Akt")).toEqual({
      prefix: "akt",
      limit: 3,
      heading: "Aktuelle Einblicke",
      showDate: false
    });
    expect(getRelatedPostsConfig("beauty", "Beauty").showDate).toBe(false);
    expect(getRelatedPostsConfig("couples", "Pärchen").heading).toBe("Aktuelle Einblicke");
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
