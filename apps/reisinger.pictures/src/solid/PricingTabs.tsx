import { formatExactPrice } from "@reisinger/shared/utils";
import { flexPrivacyBase } from "@reisinger/shared/utils/pricing";
import { createSignal, createUniqueId, onCleanup, onMount, Show } from "solid-js";

import { parsePricingUrl, type PricingTariff, type PricingUrlState, serializePricingUrl, switchPricingTariff } from "./pricing-url-state";
import PricingCalculator from "./PricingCalculator";
import PricingCalculatorProfi from "./PricingCalculatorProfi";

export default function PricingTabs() {
  // SSG cannot know the query string. Do not render a wrong calculator/price
  // before hydration; read the complete URL once, without serializing defaults.
  const [configuration, setConfiguration] = createSignal(parsePricingUrl(new URLSearchParams()));
  const [ready, setReady] = createSignal(false);
  const activeTab = () => ready() ? configuration().tariff : undefined;
  const id = createUniqueId();

  onMount(() => {
    const readUrl = () => setConfiguration(parsePricingUrl(new URLSearchParams(window.location.search)));
    readUrl();
    setReady(true);
    window.addEventListener("popstate", readUrl);
    onCleanup(() => window.removeEventListener("popstate", readUrl));
  });

  const update = (next: PricingUrlState, push = false) => {
    const url = serializePricingUrl(new URL(window.location.href), next);
    if (push) window.history.pushState(window.history.state, "", url);
    else window.history.replaceState(window.history.state, "", url);
    setConfiguration(next);
  };

  const switchTab = (tab: PricingTariff) => {
    const current = configuration();
    if (ready() && current.tariff !== tab) update(switchPricingTariff(current, tab), true);
  };

  const onTabKeyDown = (event: KeyboardEvent, tab: PricingTariff) => {
    let next: PricingTariff;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") next = tab === "standard" ? "flex" : "standard";
    else if (event.key === "Home") next = "standard";
    else if (event.key === "End") next = "flex";
    else return;
    event.preventDefault();
    switchTab(next);
    document.getElementById(`${id}-${next}-tab`)?.focus();
  };

  const requestHref = (message: string, subject?: string) => {
    const url = serializePricingUrl(new URL(window.location.href), configuration());
    url.searchParams.set("message", message);
    if (subject) url.searchParams.set("subject_prefix", subject);
    else url.searchParams.delete("subject_prefix");
    return url.pathname + url.search + "#kontakt";
  };

  return (
    <div data-pricing-ready={ready()} class="card bg-base-100 border-2 border-primary/30 shadow-xl rounded-2xl overflow-hidden">
      {/* Tab Bar */}
      <div class="tabs grid grid-cols-2" role="tablist" aria-label="Shooting-Tarif">
        <button
          type="button"
          id={`${id}-standard-tab`}
          role="tab"
          aria-controls={`${id}-standard-panel`}
          aria-selected={activeTab() === "standard"}
          tabIndex={activeTab() !== "flex" ? 0 : -1}
          onKeyDown={(event) => onTabKeyDown(event, "standard")}
          class={"tab h-auto px-4 py-4 text-sm font-black uppercase tracking-wider transition-all duration-200 " +
            (activeTab() === "standard"
              ? "bg-primary text-primary-content shadow-inner"
              : "bg-base-200 text-base-content/60 hover:text-base-content/90 hover:bg-base-300")}
          onClick={() => switchTab("standard")}
        >
          Standard
        </button>
        <button
          type="button"
          id={`${id}-flex-tab`}
          role="tab"
          aria-controls={`${id}-flex-panel`}
          aria-selected={activeTab() === "flex"}
          tabIndex={activeTab() === "flex" ? 0 : -1}
          onKeyDown={(event) => onTabKeyDown(event, "flex")}
          class={"tab h-auto px-4 py-4 text-sm font-black uppercase tracking-wider transition-all duration-200 " +
            (activeTab() === "flex"
              ? "bg-primary text-primary-content shadow-inner"
              : "bg-base-200 text-base-content/60 hover:text-base-content/90 hover:bg-base-300")}
          onClick={() => switchTab("flex")}
        >
          Flex
        </button>
      </div>

      {/* Tab Content */}
      <div class="p-4 md:p-6">
        <div id={`${id}-standard-panel`} role="tabpanel" aria-labelledby={`${id}-standard-tab`} tabIndex={0} hidden={activeTab() !== "standard"} class="space-y-4">
          <Show when={activeTab() === "standard"}>
            <div class="text-sm text-base-content/70 leading-relaxed space-y-2">
              <p class="m-0">
                <strong class="text-base-content">Transparent & fair</strong> – der Standard-Tarif gilt
                für private und geschäftliche Shootings gleichermaßen. Keine versteckten Kosten.
              </p>
              <p class="m-0">
                <strong class="text-base-content">Diskretion als Standard</strong> – deine Bilder unterliegen
                der Verschwiegenheit. Ohne Rabatt ist keine Veröffentlichung enthalten: Eine Nutzung
                braucht deine gesonderte, ausdrückliche Freigabe.
              </p>
              <p class="m-0">
                <strong class="text-base-content">Mit Rabatt</strong> (Studierenden- oder Freundes-Rabatt)
                ist die Freigabe ausgewählter Bilder zur Veröffentlichung Bestandteil des Angebots. Ob und
                welche Bilder gezeigt werden dürfen, stimmen wir gemeinsam ab, bevor die Buchung gilt –
                ein Klick im Konfigurator allein ist dafür noch keine Zusage.
              </p>
            </div>

            <PricingCalculatorProfi
              configuration={configuration().standard}
              onChange={(standard) => update({ ...configuration(), standard })}
              requestHref={requestHref}
            />
          </Show>
        </div>

        <div id={`${id}-flex-panel`} role="tabpanel" aria-labelledby={`${id}-flex-tab`} tabIndex={0} hidden={activeTab() !== "flex"} class="space-y-4">
          <Show when={activeTab() === "flex"}>
            <div class="text-sm text-base-content/70 leading-relaxed space-y-2">
              <p class="m-0">
                <strong class="text-base-content">Flex – mein kreativer Einstieg</strong> für private
                Sessions: dieselbe fotografische Qualität wie im Standard-Tarif, zu einem kleineren Preis,
                dafür ohne kommerzielle Bildnutzung.
              </p>
              <p class="m-0">
                Beim Flex-Tarif ist die <strong class="text-base-content">Freigabe ausgewählter Bilder zur
                Veröffentlichung</strong> Bestandteil des Angebots; was gezeigt werden darf, stimmen wir vor
                der Buchung ab – ein Klick im Konfigurator allein ist dafür noch keine Zusage. Einzige
                Ausnahme ist das unten beschriebene Akt-&amp;-Boudoir-Modell ohne Online-Veröffentlichung.
              </p>
            </div>

            <PricingCalculator
              configuration={configuration().flex}
              onChange={(flex) => update({ ...configuration(), flex })}
              requestHref={requestHref}
            />

            {/* Privacy & Setup Details */}
            <div class="space-y-3">
              <details class="group border border-base-300 rounded-xl overflow-hidden">
                <summary class="flex items-center justify-between px-4 py-3 bg-base-200/50 cursor-pointer text-sm font-black text-base-content hover:bg-base-200 transition-colors">
                  <span class="flex items-center gap-2">
                    <span>&#x1F512;</span>
                    Diskretion bei Akt & Boudoir
                  </span>
                  <span class="text-base-content/40 group-open:rotate-180 transition-transform text-xs">&#x25BC;</span>
                </summary>
                <div class="px-4 py-4 space-y-4 text-sm leading-relaxed">
                  <p class="m-0 text-base-content/80">
                    Ästhetische Aktfotografie erfordert absolutes Vertrauen und einen kompromisslosen
                    Schutzraum für deine Privatsphäre. Deshalb gilt exklusiv in diesem sensiblen Bereich
                    eine klare, verständliche Galerie-Regelung:
                  </p>
                  <div class="p-4 rounded-xl border border-base-300 bg-base-100 space-y-2">
                    <span class="badge badge-success font-black text-[11px] uppercase px-2.5 py-2">
                      &#x1F7E2; Online-Portfolio-Modus
                    </span>
                    <p class="text-sm leading-relaxed opacity-90 m-0">
                      <strong>Die Freigabe fürs Web:</strong> Wir fokussieren uns gezielt auf kunstvolle
                      Fragmente, Silhouetten, Schattenspiele oder Posen von hinten, bei denen
                      <strong> dein Gesicht nicht zu erkennen ist</strong>. Das ist eine bewusste Entscheidung
                      für das Motiv, keine Zusage: Eine Wiedererkennung oder Identifizierung lässt sich
                      damit nicht ausschließen – etwa über Kontext, Tattoos oder Begleitumstände. Das
                      schützt sensible Berufsgruppen (wie im Lehr- oder Staatsdienst) und ist gleichzeitig
                      der kreative Treibstoff, der meine Arbeit sichtbar macht.
                      <span class="text-primary font-bold"> (Standard & im Basispreis inklusive)</span>
                    </p>
                  </div>
                  <div class="p-4 rounded-xl border border-base-300 bg-base-100 space-y-2">
                    <span class="badge badge-error font-black text-[11px] uppercase px-2.5 py-2">
                      &#x1F534; Absolutes Online-Verbot
                    </span>
                    <p class="text-sm leading-relaxed opacity-90 m-0">
                      <strong>Das Stoppschild fürs Internet:</strong> Deine Bilder wandern zu 100% niemals
                      ins Netz (kein Instagram, kein Website-Upload). Ich darf ausgewählte Ergebnisse
                      ausschließlich offline im persönlichen, analogen 1:1 Gespräch auf meinen eigenen
                      Geräten zeigen, um zukünftigen Kunden meine Arbeitsqualität zu belegen. Deine Dateien
                      verlassen niemals meine Kontrolle und werden niemals digital an Dritte verschickt.
                    </p>
                  </div>
                  <p class="text-xs opacity-80 italic m-0">
                    Hinweis: Weil diesem Modus bewusst kein Anschauungsmaterial fürs Web bleibt, gibt es
                    dafür im Konfigurator einen festen Exklusiv-Aufpreis von {formatExactPrice(flexPrivacyBase)},
                    unabhängig von der Anzahl der Bilder.
                  </p>
                </div>
              </details>

              <details class="group border border-base-300 rounded-xl overflow-hidden">
                <summary class="flex items-center justify-between px-4 py-3 bg-base-200/50 cursor-pointer text-sm font-black text-base-content hover:bg-base-200 transition-colors">
                  <span class="flex items-center gap-2">
                    <span>&#x1F91D;</span>
                    Licht- & Setup-Pakt (+50 €)
                  </span>
                  <span class="text-base-content/40 group-open:rotate-180 transition-transform text-xs">&#x25BC;</span>
                </summary>
                <div class="px-4 py-4 space-y-3 text-sm leading-relaxed">
                  <p class="m-0 text-base-content/80">
                    Egal ob Indoor-Fotostudio oder markante Outdoor-Locations mit Studioblitzen –
                    aufwendige Inszenierungen erfordern viel schweres Material und logistischen Einsatz.
                    Wir lösen das über ein faires, partnerschaftliches Miteinander:
                  </p>
                  <ul class="list-disc list-inside space-y-1 pl-1 text-sm opacity-90 m-0">
                    <li>
                      <strong>Bei Indoor-Aufnahmen:</strong> Wir bauen das massive 2,54m Hintergrundpapier
                      gemeinsam auf und ab. Das Abkleben oder Reinigen der Schuhe vor dem Betreten ist
                      Pflicht, ebenso das gemeinsame Zusammenräumen danach.
                    </li>
                    <li>
                      <strong>Bei Outdoor-Aufnahmen mit Blitz:</strong> Wenn dein Wunsch-Look dicke
                      Akkublitze, riesige Softboxen und Lichtformer erfordert, um spektakulär gegen die
                      Sonne anzukämpfen, schleppen wir ordentlich Gewicht und benötigen oft eine Assistenz
                      vor Ort.
                    </li>
                  </ul>
                  <p class="text-xs opacity-75 italic m-0">
                    Hinweis: Ob für deine Bildideen draußen ein mobiles Studioblitz-Equipment notwendig
                    ist, entscheide ich flexibel basierend auf unserem gemeinsamen Konzeptgespräch.
                  </p>
                </div>
              </details>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
