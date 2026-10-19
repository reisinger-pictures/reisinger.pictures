import { describe, expect, it } from "vitest";

import { groupSportAreas, orderSportAreas, SPORT_ART_HUBS, SPORT_CHILDREN, sportChildIds, UNSET_PRIORITY } from "./sport-areas";

const entry = (id: string, priority: number) => ({ id, data: { name: id, priority } });

/**
 * The 14 sport sub-areas with their content priorities. `acsl`, `swl` and
 * `steelvolleys` set none, so `shootingAreaSchema` fills in the sentinel.
 */
const SPORT_SUB_AREAS = [
  entry("sport/american-football", 1),
  entry("sport/basketball", 4),
  entry("sport/eishockey", 3),
  entry("sport/fussball", 2),
  entry("sport/volleyball", 5),
  entry("sport/dragons", 2),
  entry("sport/vikings", 3),
  entry("sport/acsl", UNSET_PRIORITY),
  entry("sport/bwl", 2),
  entry("sport/swl", UNSET_PRIORITY),
  entry("sport/lask", 1),
  entry("sport/oefb", 3),
  entry("sport/skv", 2),
  entry("sport/steelvolleys", UNSET_PRIORITY)
];

describe("sport area map", () => {
  it("covers the 5 art hubs and 9 unique children", () => {
    expect(SPORT_ART_HUBS).toHaveLength(5);

    const childIds = sportChildIds();
    expect(childIds).toHaveLength(9);
    expect(new Set(childIds).size).toBe(9);
  });

  it("keeps every child under exactly one hub and no hub as a child", () => {
    const hubs: readonly string[] = SPORT_ART_HUBS;
    for (const hub of SPORT_ART_HUBS) {
      for (const child of SPORT_CHILDREN[hub]) {
        expect(hubs).not.toContain(child);
        expect(sportChildIds().filter((id) => id === child)).toHaveLength(1);
      }
    }
  });
});

describe("orderSportAreas", () => {
  it("orders by ascending priority", () => {
    const sorted = orderSportAreas([entry("a", 1), entry("b", 9), entry("c", 3)]);
    expect(sorted.map((area) => area.id)).toEqual(["a", "c", "b"]);
  });

  it("places the unranked sentinel last, keeping the declaration order", () => {
    const sorted = orderSportAreas([
      entry("unranked-a", UNSET_PRIORITY),
      entry("ranked", 2),
      entry("unranked-b", UNSET_PRIORITY)
    ]);
    expect(sorted.map((area) => area.id)).toEqual(["ranked", "unranked-a", "unranked-b"]);
  });

  it("does not mutate the input list", () => {
    const input = [entry("a", 1), entry("b", 2)];
    const before = [...input];
    orderSportAreas(input);
    expect(input).toEqual(before);
  });
});

describe("groupSportAreas", () => {
  it("orders the hubs by ascending priority", () => {
    const groups = groupSportAreas(SPORT_SUB_AREAS);
    expect(groups.map((group) => group.hub.id)).toEqual([
      "sport/american-football",
      "sport/fussball",
      "sport/eishockey",
      "sport/basketball",
      "sport/volleyball"
    ]);
  });

  it("groups every child under its hub, in ascending priority order with unranked last", () => {
    const groups = groupSportAreas(SPORT_SUB_AREAS);
    const byHub = Object.fromEntries(groups.map((group) => [group.hub.id, group.children.map((child) => child.id)]));
    expect(byHub).toEqual({
      "sport/volleyball": ["sport/steelvolleys"],
      "sport/basketball": ["sport/acsl"],
      "sport/eishockey": ["sport/bwl", "sport/swl"],
      "sport/fussball": ["sport/lask", "sport/skv", "sport/oefb"],
      "sport/american-football": ["sport/dragons", "sport/vikings"]
    });
  });

  it("resolves all 14 mapped sub-areas and ignores unrelated entries", () => {
    const groups = groupSportAreas([...SPORT_SUB_AREAS, entry("sport", UNSET_PRIORITY), entry("akt", 9999)]);

    const resolved = groups.flatMap((group) => [group.hub.id, ...group.children.map((child) => child.id)]);
    expect(resolved).toHaveLength(14);
    expect(new Set(resolved).size).toBe(14);
    expect(resolved).not.toContain("sport");
  });

  it("skips mapped ids without a matching entry instead of crashing", () => {
    const groups = groupSportAreas([entry("sport/volleyball", 5)]);
    expect(groups.map((group) => group.hub.id)).toEqual(["sport/volleyball"]);
    expect(groups[0]?.children).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const input = [...SPORT_SUB_AREAS];
    const before = [...input];
    groupSportAreas(input);
    expect(input).toEqual(before);
  });
});
