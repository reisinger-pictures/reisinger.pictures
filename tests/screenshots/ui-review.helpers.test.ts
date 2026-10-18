import assert from "node:assert/strict";
import { test } from "node:test";
import { reviewViewports, routes } from "./ui-review.config.ts";
import { FULL_PAGE_MAX_SECTIONS, HEIGHT_GROWTH_TOLERANCE, nextSectionPosition, reviewPort, reviewTarget, reviewTargets, sampledSectionIndexes, screenshotPath, SECTION_SAMPLE_DEFAULTS, sectionPositions } from "./ui-review.helpers.ts";

test("exactly six unique viewport/theme projects and output paths", () => {
  assert.equal(reviewTargets.length, 6);
  assert.equal(new Set(reviewTargets.map((target) => `${target.viewport}-${target.theme}`)).size, 6);
  const paths = reviewTargets.map((target) => screenshotPath("test-results/ui-screenshots", "filled", target, "home.png"));
  assert.equal(new Set(paths).size, 6);
  for (const target of reviewTargets) {
    assert.deepEqual(reviewTarget({ uiReview: target }), target);
    assert.ok(screenshotPath("out", "filled", target, "home.png").endsWith(`/filled/${target.theme}/${target.viewport}/home.png`));
    assert.ok(reviewViewports[target.viewport].width > 0);
  }
});

test("missing or mistyped metadata cannot silently become desktop", () => {
  for (const metadata of [{}, { uiReview: { viewport: "tablet", theme: "light" } }, { uiReview: { viewport: "mobile", theme: "system" } }]) {
    assert.throws(() => reviewTarget(metadata), /metadata/);
  }
});

test("route filenames are unique and static pages do not invent empty states", () => {
  assert.equal(new Set(routes.map((route) => route.name)).size, routes.length);
  for (const route of routes) assert.match(route.name, /^[a-z0-9-]+$/);
  for (const name of ["home", "pricing-standard", "pricing-flex", "pricing-flex-private"]) {
    assert.deepEqual(routes.find((route) => route.name === name)?.states, ["filled"]);
  }
});

test("local port is explicit and bounded", () => {
  assert.equal(reviewPort("4325"), 4325);
  assert.equal(reviewPort("44325"), 44325);
  for (const value of ["", "0", "80", "65536", "4325.1", "other", "-1"]) assert.throws(() => reviewPort(value));
});

test("section steps overlap and cover the exact footer", () => {
  const positions = [0];
  while (positions.at(-1)! < 2250) positions.push(nextSectionPosition(positions.at(-1)!, 1000, 2250));
  assert.deepEqual(positions, [0, 800, 1600, 2250]);
  assert.equal(nextSectionPosition(0, 1000, 0), 0);
});

test("long content is not truncated at 100 sections", () => {
  let position = 0;
  let sections = 1;
  while (position < 90000) {
    const next = nextSectionPosition(position, 900, 90000);
    assert.ok(next > position && next - position <= 720);
    position = next;
    sections += 1;
  }
  assert.equal(position, 90000);
  assert.equal(sections, 126);
});

test("section sampling keeps the page top and the footer tail, skips the middle", () => {
  assert.equal(SECTION_SAMPLE_DEFAULTS.leadingSections, 4);
  assert.equal(SECTION_SAMPLE_DEFAULTS.trailingSections, 2);
  // Short pages collapse into a complete capture.
  assert.deepEqual(sampledSectionIndexes(1), [0]);
  assert.deepEqual(sampledSectionIndexes(4), [0, 1, 2, 3]);
  assert.deepEqual(sampledSectionIndexes(5), [0, 1, 2, 3, 4]);
  // Long pages keep the top four and the last two (footer), nothing between.
  assert.deepEqual(sampledSectionIndexes(9), [0, 1, 2, 3, 7, 8]);
  assert.deepEqual(sampledSectionIndexes(140), [0, 1, 2, 3, 138, 139]);
  const sampled = sampledSectionIndexes(140);
  assert.ok(sampled.every((value, index) => index === 0 || value > sampled[index - 1]), "unique and ascending");
  // The footer section is always the last index and always sampled.
  assert.equal(sampled.at(-1), 139);
  // A manifest route can widen the top window; the footer tail is unaffected.
  const widened = sampledSectionIndexes(20, { leadingSections: 6 });
  assert.deepEqual(widened, [0, 1, 2, 3, 4, 5, 18, 19]);
  assert.throws(() => sampledSectionIndexes(10, { leadingSections: -1 }), /windows/);
  // The full-page overview is only written where it stays readable.
  assert.equal(FULL_PAGE_MAX_SECTIONS, 8);
  assert.equal(HEIGHT_GROWTH_TOLERANCE, 1);
});

test("section positions match the walk step and re-anchor from the same geometry", () => {
  assert.deepEqual(sectionPositions(1000, 2250), [0, 800, 1600, 2250]);
  assert.deepEqual(sectionPositions(1000, 0), [0]);
});
