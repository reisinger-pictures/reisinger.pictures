import { roundToPsychologicalValue } from "@reisinger/shared/utils";
import { flexBasePrice, flexImagePrice, flexImagesIncluded, flexPrivacyBase, flexPrivacyPerImage, flexSetupSurcharge } from "@reisinger/shared/utils/pricing";
import { createEffect, createMemo, createSignal, onMount, Show } from "solid-js";

export default function PricingCalculator() {
  const [shootingType, setShootingType] = createSignal("portrait");
  const [setupType, setSetupType] = createSignal("outdoor");
  const [extraImages, setExtraImages] = createSignal(0);
  const [isFullyPrivate, setIsFullyPrivate] = createSignal(false);

  onMount(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("type")) setShootingType(params.get("type") ?? "portrait");
      if (params.has("setup")) setSetupType(params.get("setup") ?? "outdoor");
      if (params.has("extra")) setExtraImages(parseInt(params.get("extra") ?? "0", 10));
      if (params.has("private")) setIsFullyPrivate(params.get("private") === "true");
    }
  });

  createEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (shootingType() !== "portrait") params.set("type", shootingType());
      else params.delete("type");
      if (setupType() !== "outdoor") params.set("setup", setupType());
      else params.delete("setup");
      if (extraImages() > 0) params.set("extra", extraImages().toString());
      else params.delete("extra");
      if (shootingType() === "akt" && isFullyPrivate()) params.set("private", "true");
      else params.delete("private");
      
      const queryString = params.toString();
      const newUrl = window.location.pathname + (queryString ? "?" + queryString : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  });

  const totalImages = createMemo(() => flexImagesIncluded + extraImages());

  const finalPrice = createMemo(() => {
    let total = flexBasePrice;
    if (setupType() === "outdoor_flash" || setupType() === "indoor") total += flexSetupSurcharge;
    total += extraImages() * flexImagePrice;
    if (shootingType() === "akt" && isFullyPrivate()) {
      total += flexPrivacyBase + (totalImages() * flexPrivacyPerImage);
    }
    return roundToPsychologicalValue(total);
  });

  const contactLink = createMemo(() => {
    let msg = "Hallo Florian,\n\nich interessiere mich für eine Jam-Session im B2C Flex-Tarif.\n\n";
    msg += "Konfiguration:\n- Bereich: " + (shootingType() === "akt" ? "Akt & Boudoir" : shootingType() === "couples" ? "Pärchen & Liebe" : "Portrait & Beauty") + "\n";
    msg += "- Dauer: 1,5 bis 2 Stunden\n";
    msg += "- Setup: " + (setupType() === "indoor" ? "Indoor Fotostudio (+ Setup-Pakt)" : setupType() === "outdoor_flash" ? "Outdoor mit mobilem Blitz-Setup (+ Setup-Pakt)" : "Outdoor mit natürlichem Licht") + "\n";
    msg += "- Erwartete Bilderanzahl: " + totalImages() + " Stück\n";
    if (shootingType() === "akt") {
      msg += "- Galerie-Modus: " + (isFullyPrivate() ? "Absolutes Online-Verbot" : "Standard Online-Freigabe") + "\n";
    }
    msg += "\nErrechneter Paketpreis: " + finalPrice() + " €\n\nIch habe die Spielregeln gelesen. Passt das Konzept für dich?\n";
    return "?message=" + encodeURIComponent(msg) + "#kontakt";
  });

  return (
    <div class="card shadow-2xl bg-base-100 text-base-content border-2 border-primary/30 rounded-2xl overflow-hidden">
      <div class="card-body p-6 md:p-8 flex flex-col justify-between space-y-6">
        
        <div class="text-center">
          <h2 class="text-2xl font-black uppercase tracking-wider text-primary m-0">Tarif-Konfigurator</h2>
          <p class="opacity-70 text-xs font-bold mt-1 uppercase tracking-widest text-base-content/70">
            Stelle deine Session zusammen
          </p>
        </div>

        {/* Live-Leistungsanzeige */}
        <div class="flex flex-col items-center justify-center bg-base-200 border-2 border-base-300 rounded-xl py-5 shadow-inner text-center px-4">
          <span class="text-6xl font-black tracking-tight text-primary">{finalPrice()} €</span>
          <div class="w-full border-t border-base-300 my-3 opacity-40"></div>
          <div class="flex flex-col gap-1 text-sm font-black text-base-content/90">
            <span class="flex items-center justify-center gap-1.5">
              <span class="icon-[mdi--clock-outline] text-primary text-base"></span>
              1,5 bis 2 Stunden Shooting-Zeit
            </span>
            <span class="flex items-center justify-center gap-1.5">
              <span class="icon-[mdi--image-multiple-outline] text-primary text-base"></span>
              {flexImagesIncluded} bearbeitete Bilder inklusive
            </span>
            <Show when={extraImages() > 0}>
              <span class="flex items-center justify-center gap-1.5 text-warning">
                <span class="icon-[mdi--plus-circle-outline] text-warning text-base"></span>
                +{extraImages()} Zusatzbilder (+{roundToPsychologicalValue(extraImages() * flexImagePrice)} €)
              </span>
            </Show>
          </div>
        </div>

        <div class="space-y-5">
          {/* 1. Schritt: Welcher Bereich */}
          <div>
            <label class="label text-sm font-black p-0 mb-2 text-base-content">1. Was wollen wir shooten?</label>
            <div class="flex flex-col gap-2">
              <button type="button" class={"btn btn-sm justify-start border-2 " + (shootingType() === "portrait" ? "btn-primary text-white border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setShootingType("portrait")}>
                👤 Portrait & Beauty
              </button>
              <button type="button" class={"btn btn-sm justify-start border-2 " + (shootingType() === "couples" ? "btn-primary text-white border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setShootingType("couples")}>
                👩&zwj;❤️&zwj;👨 Pärchen & Liebe
              </button>
              <button type="button" class={"btn btn-sm justify-start border-2 " + (shootingType() === "akt" ? "btn-primary text-white border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setShootingType("akt")}>
                🔒 Akt & Boudoir (Sicherer Raum)
              </button>
            </div>
          </div>

          {/* 2. Schritt: Licht & Umgebung (Die 3 sauberen Optionen) */}
          <div>
            <label class="label text-sm font-black p-0 mb-2 text-base-content">2. Licht- & Setup-Wahl:</label>
            <div class="flex flex-col gap-2">
              <button type="button" class={"btn btn-sm justify-start border-2 " + (setupType() === "outdoor" ? "btn-primary text-white border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setSetupType("outdoor")}>
                🌲 Outdoor (Natürliches Licht)
              </button>
              <button type="button" class={"btn btn-sm justify-start border-2 " + (setupType() === "outdoor_flash" ? "btn-primary text-white border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setSetupType("outdoor_flash")}>
                ⚡ Outdoor (Mobiles Blitz-Setup)
              </button>
              <button type="button" class={"btn btn-sm justify-start border-2 " + (setupType() === "indoor" ? "btn-primary text-white border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setSetupType("indoor")}>
                📸 Indoor (Fotostudio)
              </button>
            </div>
          </div>

          {/* 3. Schritt: Bild-Nachschlag */}
          <div>
            <label class="label text-sm font-black flex justify-between p-0 mb-1 text-base-content">
              <span>3. Zusätzlicher Bild-Nachschlag:</span>
              <span class="text-primary font-black text-base">+{extraImages()} Bilder</span>
            </label>
            <input type="range" min="0" max="30" step="1" value={extraImages()} onInput={(e) => setExtraImages(parseInt(e.currentTarget.value))} class="range range-primary range-sm w-full cursor-pointer border-none p-0 bg-transparent" />
          </div>

          {/* 4. Schritt: Dynamischer Schutzraum-Toggle */}
          <Show when={shootingType() === "akt"}>
            <div class="form-control border-2 border-base-300 rounded-xl px-4 py-4 bg-base-200/50 transition-all hover:border-primary/40">
              <label class="label grid grid-cols-[1fr_auto] items-center gap-4 cursor-pointer p-0 text-left">
                <div class="flex flex-col space-y-0.5">
                  <span class="font-black text-sm text-base-content block">🔴 Absolutes Online-Verbot</span>
                  <span class="text-[11px] text-base-content/80 font-medium leading-relaxed block whitespace-normal">
                    Stoppschild fürs Internet. Die Bilder werden niemals online veröffentlicht, dürfen aber offline im persönlichen 1:1 Gespräch als Qualitätsnachweis gezeigt werden.
                  </span>
                </div>
                <input type="checkbox" checked={isFullyPrivate()} onChange={(e) => setIsFullyPrivate(e.currentTarget.checked)} class="checkbox checkbox-primary checkbox-md" />
              </label>
            </div>
          </Show>
        </div>

        <div class="card-actions pt-2 flex flex-col items-center gap-1">
          <a href={contactLink()} data-contact-open="pricing" class="btn btn-primary btn-block btn-lg text-white font-black uppercase tracking-wider text-sm shadow-lg border-none">
            Anfrage absenden
          </a>
          <span class="text-[10px] opacity-60 font-semibold uppercase tracking-wider mt-1 text-center">
            Richtpreis – je nach Aufwand potentiell abweichend
          </span>
        </div>
        
      </div>
    </div>
);
}