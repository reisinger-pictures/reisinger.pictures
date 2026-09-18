import { roundToPsychologicalValue } from "@reisinger/shared/utils";
import {
  basePrice,
  friendDiscountMultiplier,
  hourlyRate,
  standardImagePriceIndoor,
  standardImagePriceOutdoor,
  studentDiscountMultiplier
} from "@reisinger/shared/utils/pricing";
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";

export default function PricingCalculatorProfi() {
  const [hours, setHours] = createSignal(1);
  const [images, setImages] = createSignal(15);
  const [location, setLocation] = createSignal<"indoor" | "outdoor">("outdoor");
  const [isStudent, setIsStudent] = createSignal(false);
  const [isFriend, setIsFriend] = createSignal(false);
  const [showFriend, setShowFriend] = createSignal(false);
  const [friendCode, setFriendCode] = createSignal(false);
  let historyTimeout: number;

  onMount(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("code") && params.get("code") === "friend") {
        setShowFriend(true);
        setFriendCode(true);
      }
      if (params.has("h")) setHours(parseFloat(params.get("h") ?? "1"));
      if (params.has("img")) setImages(parseInt(params.get("img") ?? "15", 10));
      if (params.has("location")) setLocation(params.get("location") as "indoor" | "outdoor");
      if (params.has("student")) setIsStudent(params.get("student") === "true");
      if (params.has("friend")) setIsFriend(params.get("friend") === "true");
    }
  });

  createEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (friendCode()) params.set("code", "friend");
      else params.delete("code");
      if (hours() !== 1) params.set("h", hours().toString());
      else params.delete("h");
      if (images() !== 15) params.set("img", images().toString());
      else params.delete("img");
      if (location() !== "indoor") params.set("location", location());
      else params.delete("location");
      if (isStudent()) params.set("student", "true");
      else params.delete("student");
      if (isFriend() && showFriend()) params.set("friend", "true");
      else params.delete("friend");
      const query = params.toString();
      const newUrl = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
      clearTimeout(historyTimeout);
      historyTimeout = window.setTimeout(() => {
        window.history.replaceState({}, "", newUrl);
      }, 250);
    }
    onCleanup(() => clearTimeout(historyTimeout));
  });

  const imagePrice = createMemo(() =>
    location() === "outdoor" ? standardImagePriceOutdoor : standardImagePriceIndoor
  );

  const totalImages = createMemo(() => images());

  const finalPrice = createMemo(() => {
    const timePrice = hours() * hourlyRate;
    const imagesPrice = images() * imagePrice();
    let total = basePrice + timePrice + imagesPrice;

    if (isStudent()) total *= studentDiscountMultiplier;
    if (isFriend() && showFriend()) total *= friendDiscountMultiplier;

    return roundToPsychologicalValue(total);
  });

  const contactLink = createMemo(() => {
    let msg = "Hallo Florian,\n\nich interessiere mich für ein Shooting im Profi-Tarif.\n\n";
    msg += "Konfiguration:\n";
    msg += "- Stunden: " + hours() + " (" + (hours() * 60) + " Minuten)\n";
    msg += "- Bilder: " + images() + " Stück\n";
    msg += "- Location: " + (location() === "indoor" ? "Indoor Studio" : "Outdoor") + "\n";
    if (isStudent()) msg += "- Studenten-Rabatt (30%)\n";
    if (isFriend() && showFriend()) msg += "- Freunde-Rabatt (50%)\n";
    msg += "\nErrechneter Preis: " + finalPrice() + " €\n\nIch freue mich auf deine Rückmeldung!\n";
    return "?subject_prefix=PROFI&message=" + encodeURIComponent(msg) + "#kontakt";
  });

  const discountActive = createMemo(() => isStudent() || (isFriend() && showFriend()));

  return (
    <div class="space-y-6">
      <div class="flex flex-col items-center justify-center bg-base-200 border-2 border-base-300 rounded-xl py-5 shadow-inner text-center px-4">
        <Show when={discountActive()}>
          <span class="text-sm font-bold text-base-content/60 line-through">{roundToPsychologicalValue(finalPrice() / (isStudent() ? studentDiscountMultiplier : 1) / (isFriend() && showFriend() ? friendDiscountMultiplier : 1))} €</span>
        </Show>
        <span class="text-6xl font-black tracking-tight text-primary">{finalPrice()} €</span>
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
          <input type="range" min="1" max="8" step="0.5" value={hours()} onInput={(e) => setHours(parseFloat(e.currentTarget.value))} class="range range-primary range-sm w-full cursor-pointer border-none p-0 bg-transparent" />
          <div class="flex justify-between text-[10px] text-base-content/40 font-bold px-0.5 mt-0.5">
            <span>1h</span><span>2h</span><span>3h</span><span>4h</span><span>5h</span><span>6h</span><span>7h</span><span>8h</span>
          </div>
        </div>

        <div>
          <label class="label text-sm font-black flex justify-between p-0 mb-1 text-base-content">
            <span>2. Bild-Anzahl</span>
            <span class="text-primary font-black">{images()} Bilder</span>
          </label>
          <input type="range" min="1" max="50" step="1" value={images()} onInput={(e) => setImages(parseInt(e.currentTarget.value))} class="range range-primary range-sm w-full cursor-pointer border-none p-0 bg-transparent" />
        </div>

        <div>
          <label class="label text-sm font-black p-0 mb-2 text-base-content">3. Location</label>
          <div class="flex gap-2">
            <button type="button" class={"btn btn-sm flex-1 border-2 " + (location() === "indoor" ? "btn-primary text-white border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setLocation("indoor")}>
              Studio Indoor
            </button>
            <button type="button" class={"btn btn-sm flex-1 border-2 " + (location() === "outdoor" ? "btn-primary text-white border-primary" : "btn-outline border-base-300 text-base-content")} onClick={() => setLocation("outdoor")}>
              Outdoor
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="form-control border-2 rounded-xl px-4 py-3 bg-base-200/50" classList={{ "border-success/50": isStudent(), "border-base-300": !isStudent() }}>
            <label class="label grid grid-cols-[1fr_auto] items-center gap-4 cursor-pointer p-0 text-left">
              <div class="flex flex-col">
                <span class="font-black text-sm text-base-content">Studenten-Rabatt (30%)</span>
                <span class="text-[11px] text-base-content/70 font-medium">Gültig für Schüler & Studierende</span>
              </div>
              <input type="checkbox" checked={isStudent()} onChange={(e) => setIsStudent(e.currentTarget.checked)} class="checkbox checkbox-success checkbox-md" />
            </label>
          </div>

          <Show when={showFriend()}>
            <div class="form-control border-2 rounded-xl px-4 py-3 bg-warning/10" classList={{ "border-warning/50": isFriend(), "border-base-300": !isFriend() }}>
              <label class="label grid grid-cols-[1fr_auto] items-center gap-4 cursor-pointer p-0 text-left">
                <div class="flex flex-col">
                  <span class="font-black text-sm text-base-content">Freunde-Rabatt (50%)</span>
                  <span class="text-[11px] text-base-content/70 font-medium">Spezieller Dankeschön-Preis für Freund:innen</span>
                </div>
                <input type="checkbox" checked={isFriend()} onChange={(e) => setIsFriend(e.currentTarget.checked)} class="checkbox checkbox-warning checkbox-md" />
              </label>
            </div>
          </Show>
        </div>
      </div>

      <div class="pt-2 flex flex-col items-center gap-1">
        <a href={contactLink()} data-contact-open="pricing" class="btn btn-primary btn-block btn-lg text-white font-black uppercase tracking-wider text-sm shadow-lg border-none">
          Angebot anfragen
        </a>
        <span class="text-[10px] opacity-60 font-semibold uppercase tracking-wider mt-1 text-center">
          Richtpreis – je nach Aufwand potentiell abweichend
        </span>
      </div>
    </div>
  );
}
