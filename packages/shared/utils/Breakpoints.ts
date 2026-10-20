import { CONTAINER_SIZES } from "./container-sizes.mjs";

type BreakpointValues = "sm" | "md" | "lg" | "xl" | "2xl";
type BreakpointValuesIncludeDefault = "default" | BreakpointValues

export type BreakPoints<T> = Record<BreakpointValuesIncludeDefault, T>;

export type NumericBreakpoints
  = Omit<BreakPoints<number>, "default">;

export const TAILWIND_BREAKPOINTS: Omit<BreakPoints<string>, "default"> = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
};

export { CONTAINER_SIZES };

export function computeSizes(sizes: NumericBreakpoints) {
  return `(max-width: ${TAILWIND_BREAKPOINTS.sm}) 100vw ${Object.entries(sizes).reverse().map(([k, columns]) => `,(min-width: ${TAILWIND_BREAKPOINTS[k as BreakpointValues]} ) calc( ${CONTAINER_SIZES[k as BreakpointValues]} / ${columns} )`).join(" ")}`;
}

export const DEFAULT_IMAGE_SIZES = [256, 640, 828, 1080, 1200, 1920, 2048];
export const LARGEST_IMAGE_SIZE = DEFAULT_IMAGE_SIZES[DEFAULT_IMAGE_SIZES.length - 1];

export function mergeBreakpoints(a: NumericBreakpoints, b?: Partial<NumericBreakpoints>): NumericBreakpoints {
  return {
    sm: (a.sm ?? 1) * (b?.sm ?? 1),
    md: (a.md ?? 1) * (b?.md ?? 1),
    lg: (a.lg ?? 1) * (b?.lg ?? 1),
    xl: (a.xl ?? 1) * (b?.xl ?? 1),
    "2xl": (a["2xl"] ?? 1) * (b?.["2xl"] ?? 1)
  };
}
