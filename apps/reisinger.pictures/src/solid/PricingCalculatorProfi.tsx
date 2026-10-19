import { calculateStandardPrice } from "@reisinger/shared/utils/pricing";
import { createMemo, Show } from "solid-js";

import type { StandardConfiguration } from "./pricing-url-state";

type Props = {
  configuration: StandardConfiguration;
  onChange: (configuration: StandardConfiguration) => void;
  requestHref: (message: string, subject?: string) => string;
};

export default function PricingCalculatorProfi(props: Props) {
  const hours = () => props.configuration.hours;
  const images = () => props.configuration.images;
  const location = () => props.configuration.location;
  const isStudent = () => props.configuration.isStudent;
  const isFriend = () => props.configuration.isFriend;
  const showFriend = () => props.configuration.friendCode;
  const setHours = (hours: number) => props.onChange({ ...props.configuration, hours });
  const setImages = (images: number) => props.onChange({ ...props.configuration, images });
  const setLocation = (location: StandardConfiguration["location"]) => props.onChange({ ...props.configuration, location });
  const setIsStudent = (isStudent: boolean) => props.onChange({ ...props.configuration, isStudent });
  const setIsFriend = (isFriend: boolean) => props.onChange({ ...props.configuration, isFriend });

  const totalImages = createMemo(() => images());

  const discountActive = createMemo(() => isStudent() || (isFriend() && showFriend()));

  // Preis-Mathematik liegt zentralisiert in `@reisinger/shared/utils/pricing`.
  const price = createMemo(() =>
    calculateStandardPrice({
      hours: hours(),
      images: images(),
      location: location(),
      isStudent: isStudent(),
      isFriend: isFriend() && showFriend()
    })
  );

  const contactLink = createMemo(() => {
    let msg = "Hallo Florian,\n\nich interessiere mich für ein Shooting im Profi-Tarif.\n\n";
    msg += "Konfiguration:\n";
    msg += "- Stunden: " + hours() + " (" + (hours() * 60) + " Minuten)\n";
    msg += "- Bilder: " + images() + " Stück\n";
    msg += "- Location: " + (location() === "indoor" ? "Indoor Studio" : "Outdoor") + "\n";
    if (isStudent()) msg += "- Studenten-Rabatt\n";
    if (isFriend() && showFriend()) msg += "- Freunde-Rabatt\n";
    // Nur wenn tatsächlich ein Rabatt greift: die damit verbundene Freigabe benennen.
    if (discountActive()) {
      msg += "- Hinweis: Mit diesem Rabatt ist die Freigabe ausgewählter Bilder zur Veröffentlichung Bestandteil des Angebots (Abstimmung vor der Buchung)\n";
    }
    msg += "\nErrechneter Preis: " + price().finalPrice + " €\n\nIch freue mich auf deine Rückmeldung!\n";
    return props.requestHref(msg, "PROFI");
  });

  return (
    <div class="space-y-6">
      <div class="flex flex-col items-center justify-center bg-base-200 border-2 border-base-300 rounded-xl py-5 shadow-inner text-center px-4">
        <Show when={discountActive()}>
          <span class="text-sm font-bold text-base-content/60 line-through">{price().packagePrice} €</span>
        </Show>
        <span data-testid="pricing-total" class="text-6xl font-black tracking-tight text-primary">{price().finalPrice} €</span>
        <div class="w-full border-t border-base-300 my-3 opacity-40"></div>
        <div class="flex flex-col gap-1 text-sm font-black text-base-content/90">
          <span class="flex items-center justify-center gap-1.5">
            <span class="text-primary text-base">&#x23F1;</span>
            {hours()} {hours() === 1 ? "Stunde" : "Stunden"} ({hours() * 60} Minuten)
          </span>
          <span class="flex items-center justify-center gap-1.5">
            <span class="text-primary text-base">&#x1F5BC;</span>
            {totalImages()} bearbeitete Bilder
          </span>
        </div>
      </div>

      <div class="space-y-5">
        <div>
          <label class="label text-sm font-black flex justify-between p-0 mb-1 text-base-content">
            <span>1. Shooting-Dauer</span>
            <span class="text-primary font-black">{hours()} {hours() === 1 ? "Stunde" : "Stunden"}</span>
          </label>
          <input aria-label="Shooting-Dauer in Stunden" type="range" min="1" max="8" step="0.5" value={hours()} onInput={(e) => setHours(parseFloat(e.currentTarget.value))} class="range range-primary range-sm w-full cursor-pointer border-none p-0 bg-transparent" />
          <div class="flex justify-between text-[10px] text-base-content/40 font-bold px-0.5 mt-0.5">
            <span>1h</span><span>2h</span><span>3h</span><span>4h</span><span>5h</span><span>6h</span><span>7h</span><span>8h</span>
          </div>
        </div>

        <div>
          <label class="label text-sm font-black flex justify-between p-0 mb-1 text-base-content">
            <span>2. Bild-Anzahl</span>
            <span class="text-primary font-black">{images()} Bilder</span>
          </label>
          <input aria-label="Anzahl bearbeiteter Bilder" type="range" min="1" max="50" step="1" value={images()} onInput={(e) => setImages(parseInt(e.currentTarget.value))} class="range range-primary range-sm w-full cursor-pointer border-none p-0 bg-transparent" />
        </div>

        <div>
          <label class="label text-sm font-black p-0 mb-2 text-base-content">3. Location</label>
          <div class="flex gap-2">
            <button type="button" aria-pressed={location() === "indoor"} class={"btn btn-sm flex-1 border-2 " + (location() === "indoor" ? "btn-primary text-primary-content border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setLocation("indoor")}>
              Studio Indoor
            </button>
            <button type="button" aria-pressed={location() === "outdoor"} class={"btn btn-sm flex-1 border-2 " + (location() === "outdoor" ? "btn-primary text-primary-content border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setLocation("outdoor")}>
              Outdoor
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="form-control border-2 rounded-xl px-4 py-3 bg-base-200/50" classList={{ "border-success/50": isStudent(), "border-base-300": !isStudent() }}>
            <label class="label grid grid-cols-[1fr_auto] items-center gap-4 cursor-pointer p-0 text-left">
              <div class="flex flex-col">
                <span class="font-black text-sm text-base-content">Studenten-Rabatt</span>
                <span class="text-[11px] text-base-content/70 font-medium">Gültig für Schüler & Studierende</span>
              </div>
              <input type="checkbox" checked={isStudent()} onChange={(e) => setIsStudent(e.currentTarget.checked)} class="checkbox checkbox-success checkbox-md" />
            </label>
          </div>

          <Show when={showFriend()}>
            <div class="form-control border-2 rounded-xl px-4 py-3 bg-warning/10" classList={{ "border-warning/50": isFriend(), "border-base-300": !isFriend() }}>
              <label class="label grid grid-cols-[1fr_auto] items-center gap-4 cursor-pointer p-0 text-left">
                <div class="flex flex-col">
                  <span class="font-black text-sm text-base-content">Freunde-Rabatt</span>
                  <span class="text-[11px] text-base-content/70 font-medium">Spezieller Dankeschön-Preis für Freund:innen</span>
                </div>
                <input type="checkbox" checked={isFriend()} onChange={(e) => setIsFriend(e.currentTarget.checked)} class="checkbox checkbox-warning checkbox-md" />
              </label>
            </div>
          </Show>
        </div>

        <Show when={discountActive()}>
          <p data-testid="discount-publication-condition" class="text-[11px] leading-relaxed text-base-content/70 font-medium m-0 px-1">
            Mit dem gewählten Rabatt ist die <strong class="text-base-content">Freigabe ausgewählter
            Bilder zur Veröffentlichung</strong> Bestandteil des Angebots. Umfang und Motive stimmen wir
            vor der Buchung ab.
          </p>
        </Show>
      </div>

      <div class="pt-2 flex flex-col items-center gap-1">
        <a href={contactLink()} data-contact-open="pricing" data-astro-reload class="btn btn-primary btn-block btn-lg text-primary-content font-black uppercase tracking-wider text-sm shadow-lg border-none">
          Angebot anfragen
        </a>
        <span class="text-[10px] opacity-60 font-semibold uppercase tracking-wider mt-1 text-center">
          Richtpreis – je nach Aufwand potentiell abweichend
        </span>
      </div>
    </div>
  );
}
