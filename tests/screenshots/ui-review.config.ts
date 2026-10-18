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
  /** Screens always captured at the top in addition to the sampled ones. */
  leadingSections?: number;
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
      expectedTitle: "Mehr Einblicke & Bilder - Willkommen in meiner Fotowelt – Seite 4",
    },
    {
      name: "portfolio-page-last",
      path: "/portfolio/8/",
      states: ["filled"],
      note: "Letzte Seite der Portfolio-Pagination (Seite 8 = letzte, Seite 9 existiert nicht — 404).",
      expectedTitle: "Mehr Einblicke & Bilder - Willkommen in meiner Fotowelt – Seite 8",
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
    {
      name: "content-toc",
      path: "/portfolio/sport/eishockey/ice/2025-26/s1-bwl-pvb/",
      states: ["filled"],
      note: "Content-Seite mit Inhaltsverzeichnis (zwei H2-Abschnitte) — schließt die Manifest-Lücke, durch die das injizierte ToC in keiner Aufnahme sichtbar war (rules/10-ui-review-findings.md §10).",
      expectedTitle: "Lebler-Doppelpack besiegelt souveränen Auftaktsieg der Black Wings",
      // Keep the first screens in full: the ToC block and the headings its
      // entries jump to live in the upper part of the page (§10 anchor evidence).
      leadingSections: 6,
    },
    {
      name: "shootings-beauty",
      path: "/shootings/beauty/",
      states: ["filled"],
      note: "Weitere private Angebotsseite über dasselbe area-Template wie /shootings/akt (ruhige Seitenlinie mit Inhalt).",
      expectedTitle: "Dein Beauty-Fotoshooting in Linz – Ganz du selbst",
    },
    {
      name: "shootings-couples",
      path: "/shootings/couples/",
      states: ["filled"],
      note: "Weitere private Angebotsseite über dasselbe area-Template wie /shootings/akt (ruhige Seitenlinie mit Inhalt).",
      expectedTitle: "Eure Liebesgeschichte in Bildern – Pärchen-Fotos in Linz und Oberösterreich",
    },
    {
      name: "shootings-sport",
      path: "/shootings/sport/",
      states: ["filled"],
      note: "Sport-Übersicht der area-Collection — Einstieg in die Sport-Portfoliozweige.",
      expectedTitle: "Sportfotografie",
    },
    {
      name: "shootings-sport-hub",
      path: "/shootings/sport/eishockey/",
      states: ["filled"],
      note: "Sportart-Hub (eigenes Routenmuster: /shootings/sport/<art>/) — repräsentativ für die 5 Art-Hubs; die Übersicht ist nur der Einstieg.",
      expectedTitle: "Eishockey",
    },
    {
      name: "shootings-sport-team",
      path: "/shootings/sport/lask/",
      states: ["filled"],
      note: "Team-/Ligaseite (eigenes Routenmuster: /shootings/sport/<team>/) — repräsentativ für die 9 Team-/Liga-Seiten.",
      expectedTitle: "LASK",
    },
    {
      name: "pricing-standard-student",
      path: "/preise/?tarif=standard&student=true",
      states: ["filled"],
      note: "Direct calculator deep link with the student discount active (Standard tab). No fictional empty state.",
      expectedTitle: "Meine Tarife – Fair, transparent, flexibel",
      calculatorTab: "Standard",
    },
    {
      name: "pricing-standard-friend",
      path: "/preise/?tarif=standard&code=friend&friend=true",
      states: ["filled"],
      note: "Direct calculator deep link with the friend code/discount active (Standard tab). No fictional empty state.",
      expectedTitle: "Meine Tarife – Fair, transparent, flexibel",
      calculatorTab: "Standard",
    },
    {
      name: "pricing-default",
      path: "/preise/",
      states: ["filled"],
      note: "Barer Aufruf derselben simple-Seite /preise/ ohne Query-Parameter (Standard-Zustand des Rechners); die übrigen pricing-* Einträge sind Deep-Links. Statisch gerendert, kein sinnvoller Empty-State.",
      expectedTitle: "Meine Tarife – Fair, transparent, flexibel",
    },
    {
      name: "agb",
      path: "/agb/",
      states: ["filled"],
      note: "simple-Seite /agb/ (AGB-Text mit eingebettetem PDF) — statisch per [...simple] gerendert, kein sinnvoller Empty-State.",
      expectedTitle: "Allgemeine Geschäftsbedingungen für Fotoshootings (AGB)",
    },
    {
      name: "dsb",
      path: "/dsb/",
      states: ["filled"],
      note: "simple-Seite /dsb/ (Datenschutzbestimmungen mit eingebettetem PDF) — statisch, kein sinnvoller Empty-State.",
      expectedTitle: "Datenschutzbestimmungen (DSB)",
    },
    {
      name: "impressum",
      path: "/impressum/",
      states: ["filled"],
      note: "simple-Seite /impressum/ — statisch, kein sinnvoller Empty-State.",
      expectedTitle: "Impressum",
    },
    {
      name: "ueber-mich",
      path: "/ueber-mich/",
      states: ["filled"],
      note: "simple-Seite /ueber-mich/ — statisch, kein sinnvoller Empty-State.",
      expectedTitle: "Über mich – Florian Reisinger",
    },
    {
      name: "personal-branding",
      path: "/personal-branding/",
      states: ["filled"],
      note: "simple-Seite /personal-branding/ (Business-Portraits mit Hero-Bild) — statisch, kein sinnvoller Empty-State.",
      expectedTitle: "Personal Branding – Business Portraits mit Charakter",
    },
    {
      name: "eventfotografie",
      path: "/eventfotografie/",
      states: ["filled"],
      note: "simple-Seite /eventfotografie/ — statisch, kein sinnvoller Empty-State.",
      expectedTitle: "Eventfotografie – Bilder, die ankommen",
    },
    {
      name: "share",
      path: "/share/",
      states: ["filled"],
      note: "simple-Seite /share/ (Empfehlungs-/Guthaben-Seite) — statisch, kein sinnvoller Empty-State.",
      expectedTitle: "Love it? Share it.",
    },
    {
      name: "portal",
      path: "/portal/",
      states: ["filled"],
      note: "simple-Seite /portal/ (Erklärseite zum Bild-Portal) — statisch, kein sinnvoller Empty-State.",
      expectedTitle: "Reisinger Foto Portal: Dein zentraler Bild-Zugang",
    },
    {
      name: "akt-ablauf",
      path: "/akt/ablauf/",
      states: ["filled"],
      note: "simple-Seite /akt/ablauf/ (Leitfaden mit Bildstrecke, id akt/ablauf) — statisch, kein sinnvoller Empty-State.",
      expectedTitle: "Dein Akt-Shooting: Ein Leitfaden für Vertrauen und einzigartige Bilder",
    },
    {
      name: "testimonial-detail",
      path: "/testimonials/nicolepecnik1/",
      states: ["filled"],
      note: "Repräsentative Kundenstimmen-Detailseite über die Vorlage /testimonials/[slug] — steht für alle Detailseiten, nicht für jede einzelne.",
      expectedTitle: "Eine ehrliche Bewertung von Nicole Pecnik",
    },
    {
      name: "shootings-akt-testimonials",
      path: "/shootings/akt/testimonials/",
      states: ["filled"],
      note: "Kundenstimmen-Unterseite einer Angebotsseite (/shootings/<area>/testimonials) — repräsentativ über dieselbe Vorlage wie /shootings/akt.",
      expectedTitle: "Akt & Boudoir Kundenerfahrungen",
    },
    {
      name: "not-found",
      path: "/404",
      states: ["filled"],
      note: "Astro-404-Seite (src/pages/404.astro): im Dev-Server direkt unter /404 erreichbar, im Build als dist/404.html, das der Webserver für unbekannte Pfade ausliefert. Reguläre Direkt-URL, kein erfundener Empty-State.",
      expectedTitle: "Seite nicht gefunden (404)",
    },
  ],
};

export const routes = uiReviewConfig.routes;
