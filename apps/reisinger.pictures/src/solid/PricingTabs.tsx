import { flexImagesIncluded } from "@reisinger/shared/utils/pricing";
import { createSignal, Show } from "solid-js";

import PricingCalculator from "./PricingCalculator";
import PricingCalculatorProfi from "./PricingCalculatorProfi";

type Tab = "standard" | "flex";

export default function PricingTabs() {
  const [activeTab, setActiveTab] = createSignal<Tab>("standard");

  const switchTab = (tab: Tab) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (tab === "flex") {
        const img = parseInt(params.get("img") ?? String(flexImagesIncluded), 10);
        params.set("extra", String(Math.max(0, img - flexImagesIncluded)));
      } else {
        const extra = parseInt(params.get("extra") ?? "0", 10);
        params.set("img", String(extra + flexImagesIncluded));
      }
      const query = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
    }
    setActiveTab(tab);
  };

  return (
    <div class="card bg-base-100 border-2 border-primary/30 shadow-xl rounded-2xl overflow-hidden">
      {/* Tab Bar */}
      <div class="flex" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab() === "standard"}
          class={"flex-1 px-4 py-4 text-sm font-black uppercase tracking-wider transition-all duration-200 " +
            (activeTab() === "standard"
              ? "bg-primary text-primary-content shadow-inner"
              : "bg-base-200 text-base-content/60 hover:text-base-content/90 hover:bg-base-300")}
          onClick={() => switchTab("standard")}
        >
          Standard
        </button>
        <button
          role="tab"
          aria-selected={activeTab() === "flex"}
          class={"flex-1 px-4 py-4 text-sm font-black uppercase tracking-wider transition-all duration-200 " +
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
        <Show when={activeTab() === "standard"}>
          <div class="space-y-4">
            <div class="text-sm text-base-content/70 leading-relaxed space-y-2">
              <p class="m-0">
                <strong class="text-base-content">Transparent & fair</strong> – für Privat und Business gleichermaßen.
                Keine versteckten Kosten, kein Kleingedrucktes.
              </p>
              <p class="m-0">
                <strong class="text-base-content">Diskretion als Standard</strong> – deine Bilder unterliegen
                selbstverständlich der Verschwiegenheit. Eine Veröffentlichung erfolgt nur nach deiner
                ausdrücklichen Freigabe.
              </p>
            </div>

            <PricingCalculatorProfi />
          </div>
        </Show>

        <Show when={activeTab() === "flex"}>
          <div class="space-y-4">
            <PricingCalculator />

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
                    <span class="badge badge-success bg-success/15 border-success/30 text-success-content font-black text-[11px] uppercase px-2.5 py-2">
                      &#x1F7E2; Online-Portfolio-Modus
                    </span>
                    <p class="text-sm leading-relaxed opacity-90 m-0">
                      <strong>Die Freigabe fürs Web:</strong> Wir fokussieren uns gezielt auf kunstvolle
                      Fragmente, Silhouetten, Schattenspiele oder Posen von hinten, bei denen
                      <strong> dein Gesicht niemals zu erkennen ist</strong>. Du bleibst im Netz vollkommen
                      anonym. Das garantiert den perfekten Schutz für sensible Berufsgruppen (wie im Lehr-
                      oder Staatsdienst) und ist gleichzeitig der kreative Treibstoff, der meine Arbeit
                      sichtbar macht.
                      <span class="text-primary font-bold"> (Standard & im Basispreis inklusive)</span>
                    </p>
                  </div>
                  <div class="p-4 rounded-xl border border-base-300 bg-base-100 space-y-2">
                    <span class="badge badge-error bg-error/15 border-error/30 text-error-content font-black text-[11px] uppercase px-2.5 py-2">
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
                    Hinweis: Da mir durch das absolute Online-Verbot jegliches visuelles Anschauungsmaterial
                    für das Web verloren geht, fängt ein fairer Exklusiv-Aufpreis im Konfigurator diesen
                    Verlust pro Bild linear auf.
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
          </div>
        </Show>
      </div>
    </div>
  );
}
