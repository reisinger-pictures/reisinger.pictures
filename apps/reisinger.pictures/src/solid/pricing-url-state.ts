import { flexImagesIncluded } from "@reisinger/shared/utils/pricing";

export type PricingTariff = "standard" | "flex";
export type StandardConfiguration = {
  hours: number;
  images: number;
  location: "indoor" | "outdoor";
  isStudent: boolean;
  isFriend: boolean;
  friendCode: boolean;
};
export type FlexConfiguration = {
  shootingType: "portrait" | "couples" | "akt";
  setupType: "outdoor" | "outdoor_flash" | "indoor";
  extraImages: number;
  isFullyPrivate: boolean;
};
export type PricingUrlState = {
  tariff: PricingTariff;
  standard: StandardConfiguration;
  flex: FlexConfiguration;
};

function boundedNumber(value: string | null, fallback: number, min: number, max: number, step = 1): number {
  const number = value?.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number / step) * step));
}

/** Parse both independent configurations before any browser history write. */
export function parsePricingUrl(params: URLSearchParams): PricingUrlState {
  const shootingType = params.get("type");
  const setupType = params.get("setup");
  const friendCode = params.get("code") === "friend";
  return {
    tariff: params.get("tarif") === "flex" ? "flex" : "standard",
    standard: {
      hours: boundedNumber(params.get("h"), 1, 1, 8, 0.5),
      images: boundedNumber(params.get("img"), 15, 1, 50),
      location: params.get("location") === "indoor" ? "indoor" : "outdoor",
      isStudent: params.get("student") === "true",
      isFriend: friendCode && params.get("friend") === "true",
      friendCode
    },
    flex: {
      shootingType: shootingType === "akt" || shootingType === "couples" ? shootingType : "portrait",
      setupType: setupType === "indoor" || setupType === "outdoor_flash" ? setupType : "outdoor",
      extraImages: boundedNumber(params.get("extra"), 0, 0, 30),
      isFullyPrivate: shootingType === "akt" && params.get("private") === "true"
    }
  };
}

/** Own only calculator keys; preserve unrelated query parameters and the hash. */
export function serializePricingUrl(url: URL, state: PricingUrlState): URL {
  const result = new URL(url.href);
  const params = result.searchParams;
  const set = (key: string, value: string | number | boolean, defaultValue: string | number | boolean) => {
    if (value === defaultValue) params.delete(key);
    else params.set(key, String(value));
  };
  params.set("tarif", state.tariff);
  set("h", state.standard.hours, 1);
  set("img", state.standard.images, 15);
  set("location", state.standard.location, "outdoor");
  set("student", state.standard.isStudent, false);
  set("code", state.standard.friendCode ? "friend" : "", "");
  set("friend", state.standard.friendCode && state.standard.isFriend, false);
  set("type", state.flex.shootingType, "portrait");
  set("setup", state.flex.setupType, "outdoor");
  set("extra", state.flex.extraImages, 0);
  set("private", state.flex.shootingType === "akt" && state.flex.isFullyPrivate, false);
  return result;
}

/** Carry the total image count across tariffs, bounded by the target slider. */
export function switchPricingTariff(state: PricingUrlState, tariff: PricingTariff): PricingUrlState {
  if (state.tariff === tariff) return state;
  return tariff === "flex"
    ? { ...state, tariff, flex: { ...state.flex, extraImages: Math.min(30, Math.max(0, state.standard.images - flexImagesIncluded)) } }
    : { ...state, tariff, standard: { ...state.standard, images: state.flex.extraImages + flexImagesIncluded } };
}
