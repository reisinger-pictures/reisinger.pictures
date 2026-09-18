import { createEffect, createSignal, onCleanup, onMount } from "solid-js";

const ACTION_URL = "https://form.reisinger.pictures";
const HONEYPOT_VALUE = "6786c25a-b4fc-800d-b3c6-fa0d36f41154";

const inputClass = "input w-full border-2 border-base-content/20 bg-base-100 text-base-content focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all";
const textareaClass = "textarea w-full border-2 border-base-content/20 bg-base-100 text-base-content focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all";

type Toast = {
  type: "success";
};

export default function ContactForm() {
  const [pending, setPending] = createSignal(false);
  const [toast, setToast] = createSignal<Toast | null>(null);

  onMount(() => {
    document.documentElement.dataset.formHydrated = "true";
  });

  createEffect(() => {
    if (!toast()) return;

    const container = document.createElement("div");
    container.className = "toast toast-top toast-center z-[9999] mt-16";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");

    const alert = document.createElement("div");
    alert.className = "alert bg-primary text-primary-content border-primary shadow-lg";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "currentColor");
    svg.classList.add("size-6", "shrink-0", "text-primary-content");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z");
    svg.appendChild(path);

    const message = document.createElement("span");
    message.textContent = "Nachricht erfolgreich versandt!";

    alert.append(svg, message);
    container.appendChild(alert);
    document.body.appendChild(container);

    const dismiss = setTimeout(() => {
      container.classList.add("opacity-0", "transition-opacity", "duration-[400ms]");
      setTimeout(() => container.remove(), 400);
    }, 4000);

    onCleanup(() => {
      clearTimeout(dismiss);
      container.remove();
    });
  });

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    if (pending()) return;

    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const subject = name ? `Neue Nachricht von ${name}` : "Allgemeine Anfrage";
    formData.set("subject", subject);

    setPending(true);
    try {
      const res = await fetch(ACTION_URL, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });
      if (!res.ok) {
        throw new Error(`Unexpected response status: ${res.status}`);
      }

      form.reset();

      const modal = document.getElementById("contact_modal") as HTMLDialogElement | null;
      modal?.close();

      setToast({ type: "success" });
    } catch {
      setToast(null);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <p class="text-base-content/60 text-sm text-center mb-4">Teile mir dein Projekt mit – ich melde mich zeitnah bei dir.</p>
      <form id="reisinger-contact-form" method="post" action={ACTION_URL} onSubmit={handleSubmit} class="flex flex-col w-full max-w-lg mx-auto gap-y-2 not-prose">
        <input type="hidden" id="form-subject" name="subject" value="Allgemeine Anfrage" />
        <input type="hidden" id="form__subject_prefix" name="subject_prefix" value="" />

        <label for="form__name" class="form-control w-full">
          <span class="label ml-2 mb-1">
            <span class="label-text">Name</span>
            <span class="label-text-alt text-error">*</span>
          </span>
          <input type="text" id="form__name" name="name" required class={inputClass} />
        </label>

        <label for="form_email" class="form-control w-full">
          <span class="label ml-2 mb-1">
            <span class="label-text">Email</span>
            <span class="label-text-alt text-error">*</span>
          </span>
          <input type="email" id="form_email" name="email" required class={inputClass} />
        </label>

        <label for="form__phone" class="form-control w-full">
          <span class="label ml-2 mb-1">
            <span class="label-text">Telefonnummer</span>
          </span>
          <input type="tel" id="form__phone" name="phone" class={inputClass} />
        </label>

        <label for="form_msg" class="form-control w-full">
          <span class="label ml-2 mb-1">
            <span class="label-text">Nachricht</span>
            <span class="label-text-alt text-error">*</span>
          </span>
          <textarea name="message" id="form_msg" rows="5" required class={textareaClass}></textarea>
        </label>

        <span class="hidden">
          Bitte nicht ausfüllen: <input type="checkbox" name="dsgvo" />
        </span>
        <input type="hidden" name="honeypot" value={HONEYPOT_VALUE} />
        <div class="w-full flex justify-center">
          <button
            type="submit"
            class="btn btn-lg btn-primary mt-4"
            aria-busy={pending()}
            onClick={(event) => {
              if (pending()) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            {pending() && <span class="loading loading-spinner loading-sm text-primary-content" aria-hidden="true"></span>}
            {pending() ? "Versand läuft ..." : "Nachricht senden"}
          </button>
        </div>
      </form>
    </>
  );
}
