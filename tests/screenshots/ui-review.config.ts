// UI-review route manifest — single source of truth for which pages get
// screenshotted and in which states. Edit this file to add/remove routes; the
// generic spec picks the changes up automatically.

export type UiReviewState = "filled" | "empty";
export type UiReviewViewport = "desktop" | "intermediate" | "mobile";
export type UiReviewTheme = "light" | "dark";

export const reviewViewports = {
  desktop: { width: 1920, height: 950 },
  intermediate: { width: 1024, height: 900 },
  mobile: { width: 480, height: 1040 },
} satisfies Record<UiReviewViewport, { width: number; height: number }>;

export const reviewThemes: UiReviewTheme[] = ["light", "dark"];

export interface UiReviewRoute {
  name: string;
  path: string;
  states: UiReviewState[];
  viewports?: UiReviewViewport[];
  note?: string;
  /** Static <title> of the app — guards against capturing a foreign server on the port. */
  expectedTitle: string;
  /** Readiness/identity only; calculator behavior belongs to functional E2E. */
  calculatorTab?: "Standard" | "Flex";
}

export interface UiReviewConfig {
  /** Must mirror `outputDir` in playwright.screenshots.config.ts. */
  outputDir: string;
  routes: UiReviewRoute[];
}

export const uiReviewConfig: UiReviewConfig = {
  outputDir: "test-results/ui-screenshots",
  routes: [
    {
      name: "home",
      path: "/",
      states: ["filled"],
      note: "Startseite mit Portfolio-Übersicht — statisch beim Build aus den Content-Collections gerendert, kein sinnvoller Empty-State.",
      expectedTitle: "Florian Reisinger Fotografie",
    },
    {
      name: "pricing-standard",
      path: "/preise/?tarif=standard&h=1&img=15&location=outdoor",
      states: ["filled"],
      note: "Direct calculator deep link; static content has no meaningful empty state.",
      expectedTitle: "Meine Tarife – Fair, transparent, flexibel",
      calculatorTab: "Standard",
    },
    {
      name: "pricing-flex",
      path: "/preise/?tarif=flex",
      states: ["filled"],
      note: "Direct Flex deep link; capture after the requested tab has hydrated.",
      expectedTitle: "Meine Tarife – Fair, transparent, flexibel",
      calculatorTab: "Flex",
    },
    {
      name: "pricing-flex-private",
      path: "/preise/?tarif=flex&type=akt&private=true",
      states: ["filled"],
      note: "Configured Akt/Boudoir privacy view, not an invented empty state.",
      expectedTitle: "Meine Tarife – Fair, transparent, flexibel",
      calculatorTab: "Flex",
    },
    {
      name: "portfolio",
      path: "/portfolio",
      states: ["filled"],
      note: "Portfolio-Übersicht, ERSTE Seite des paginierten Archivs (paginate pageSize 12) — nur mit Inhalt sinnvoll darstellbar.",
      expectedTitle: "Mehr Einblicke & Bilder -  Willkommen in meiner Fotowelt",
    },
    {
      name: "portfolio-page-mid",
      path: "/portfolio/4/",
      states: ["filled"],
      note: "Mittlere Seite der Portfolio-Pagination (8 Seiten gesamt, Seite 4 von 1..8).",
      expectedTitle: "Mehr Einblicke & Bilder -  Willkommen in meiner Fotowelt",
    },
    {
      name: "portfolio-page-last",
      path: "/portfolio/8/",
      states: ["filled"],
      note: "Letzte Seite der Portfolio-Pagination (Seite 8 = letzte, Seite 9 existiert nicht — 404).",
      expectedTitle: "Mehr Einblicke & Bilder -  Willkommen in meiner Fotowelt",
    },
    {
      name: "shootings",
      path: "/shootings/akt",
      states: ["filled"],
      note: "Der Pfad /shootings selbst hat keine Index-Seite (404) — stellvertretend wird die echte Area-Seite /shootings/akt erfasst.",
      expectedTitle: "Du bist Kunst: Feiere deine Schönheit mit einem ästhetischen Fotoshooting",
    },
    {
      name: "testimonials",
      path: "/testimonials",
      states: ["filled"],
      note: "Kundenbewertungen — sinnvoll nur mit vorhandenen Reviews.",
      expectedTitle: "Alle Kundenbewertungen",
    },
    {
      name: "tfp",
      path: "/tfp",
      states: ["filled"],
      note: "TFP-Projekt-Übersicht — sinnvoll nur mit vorhandenen Projekten.",
      expectedTitle: "TFP Shootings in Linz: Ideen & Projekte",
    },
    {
      name: "tfp-idea",
      path: "/tfp/in-home-lifestyle",
      states: ["filled"],
      note: "Repräsentative TFP-Ideen-Detailseite (höchste Priorität der Collection) — steht für alle Ideen-Detailseiten: generische CTA- und Fallback-Texte, kein eigener Seiteninhalt.",
      expectedTitle: "In-Home Lifestyle (Couples) | TFP Shooting Linz",
    },
    {
      name: "content-example",
      path: "/portfolio/sport/fussball/bundesliga/2026-27/grunddurchgang-02-fak-ask/",
      states: ["filled"],
      note: "Repräsentative, dynamisch gerenderte Content-Seite (neuester Portfolio-Beitrag via [...slug]-Route) — steht für alle Content-Seiten, nicht für jeden einzelnen Beitrag.",
      expectedTitle: "LASK gewinnt 2:0 bei Austria Wien in der Generali Arena",
    },
  ],
};

export const routes = uiReviewConfig.routes;
