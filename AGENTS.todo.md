# 🚀 Florian Reisinger Fotografie - Monorepo Backlog

Nur offene Punkte. Erledigtes wird nach Abschluss entfernt (Historie: Git); dauerhafte Regeln und Event-Konventionen stehen in `AGENTS.md` und `rules/`.

## Offen

- [ ] **Dependencies: typescript 6→7** – 2026-08-25: Upgrade auf ~6.0.3 erledigt (astro check 0 Errors, Lint clean, vitest 29/29 inkl. 18 Feed-Tests, Build grün). TS 7 bleibt blockiert: @astrojs/check peer `^5||^6`, typescript-eslint peer `<6.1.0` – erst nach deren Support heben.
- [ ] **UI-Review (nur technische/UI-Änderungen)** – Screenshot-Skill (`ui-review`) noch nicht angewendet: Playwright-Harness + Vision-Analyse. Referenz-Harness: `ocg-price-tracker/tests/screenshots` (`ui-screenshots.spec.ts` mit Section-Captures). Nicht nötig bei reinen Content-Änderungen (neuer Artikel, Bilder, Texte).
