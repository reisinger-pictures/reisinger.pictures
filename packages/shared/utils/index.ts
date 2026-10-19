export function groupBy<T>(
  items: T[],
  keyExtractor: (item: T) => string
): Record<string, T[]> {
  return items.reduce((groupedItems, item) => {
    const grouped = groupedItems;
    const key = keyExtractor(item);
    // Check if the key exists in groups, if not, create an empty array
    grouped[key] = grouped[key] || ([] as T);
    grouped[key].push(item);
    return grouped;
  }, {} as Record<string, T[]>);
}

export function slugToName(slug: string) {
  return slug[0].toUpperCase() + slug.substring(1);
}

export function absoluteLink(url: URL, src: string): string {
  // Robuste URL-Auflösung statt fragilem Regex und manueller String-Manipulation
  const base = new URL(url.href);
  return new URL(src.replace(/^\//, ""), base).href;
}

/**
 * Berechnet den "psychologischen" Preis.
 * Rundet auf den nächsten 5er. Wenn das Ergebnis auf 0 endet (z.B. 100, 20),
 * wird 1 abgezogen (z.B. 99, 19). Bei Werten unter 12 Euro wird normal auf ganze Euros gerundet.
 */
export function roundToPsychologicalValue(value: number): number {
  if (value < 12) {
    return Math.max(1, Math.round(value));
  }
  let rounded;
  if (value >= 1000) {
    rounded = Math.round(value / 50) * 50;
  } else {
    rounded = Math.round(value / 5) * 5;
  }
  if (rounded !== 0 && (rounded % 10 === 0 || (value >= 1000 && rounded % 50 === 0))) {
    rounded -= 1;
  }
  return rounded;
}

/**
 * Basis-Optionen für ein konsistentes Aussehen (Währung, Sprache)
 */
const BASE_OPTIONS: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "EUR",
  trailingZeroDisplay: "stripIfInteger" // Optional, je nach Browser-Support
};

/**
 * OPTION A: Psychologischer Preis (Rundung + Formatierung)
 * Beispiel: 103 -> 105 € | 98 -> 99 €
 */
export function formatPsychologicalPrice(value: number, options: Partial<Intl.NumberFormatOptions> = {}) {
  const psychologicalValue = roundToPsychologicalValue(value);
  return new Intl.NumberFormat("de-AT", {
    ...BASE_OPTIONS,
    maximumFractionDigits: 0, // Keine Cents bei psychologischen Preisen (sind immer Ganzzahlen)
    ...options
  }).format(psychologicalValue);
}

/**
 * OPTION B: Exakter Preis (Centgenau)
 * Beispiel: 123.45 -> 123,45 €
 */
export function formatExactPrice(value: number) {
  return new Intl.NumberFormat("de-AT", {
    ...BASE_OPTIONS,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function psychologicalPriceAsNumber(value: number) {
  const string = formatPsychologicalPrice(value).replace(/[^\d.]/g, "");
  return parseFloat(string);
}

export type ContactFormPrefill = {
  subject_prefix?: "BUSINESS" | "BEAUTY" | "AKT" | "COUPLES" | "TANZ" | "TFP" | "REVIEW" | "HOCHZEIT" | "REPORTAGE" | "SPORT";
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
};

/**
 * Generiert einen Link zum Kontaktformular mit optionalen vorausgefüllten Daten.
 */
export function generateContactLink(data: ContactFormPrefill): string {
  const params = new URLSearchParams();

  if (data.subject_prefix) params.append("subject_prefix", data.subject_prefix);
  if (data.name) params.append("name", data.name);
  if (data.email) params.append("email", data.email);
  if (data.phone) params.append("phone", data.phone);
  if (data.message) params.append("message", data.message);

  const queryString = params.toString();
  return queryString ? `?${queryString}#kontakt` : "#kontakt";
}
