export type ViewMode = "edit" | "split" | "preview";
export const VIEW_MODES: ViewMode[] = ["edit", "split", "preview"];

/** What a pasted screenshot is stored as. Files chosen from disk are never re-encoded. */
export type ImageFormat = "webp" | "png";
export const IMAGE_FORMATS: ImageFormat[] = ["webp", "png"];
export const IMAGE_FORMAT_COOKIE = "imageFormat";

/* --------------------------------- sidebar -------------------------------- */

export const SIDEBAR_WIDTH_COOKIE = "sidebarWidth";
export const SIDEBAR_COLLAPSED_COOKIE = "sidebarCollapsed";

export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 420;
export const SIDEBAR_DEFAULT_WIDTH = 240;

/** Clamped on the way in and out, so a hand-edited cookie can't wedge the sidebar. */
export function parseSidebarWidth(value: string | undefined): number {
  const width = Number(value);
  if (!Number.isFinite(width)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

export function parseImageFormat(value: string | undefined): ImageFormat {
  return value && (IMAGE_FORMATS as string[]).includes(value)
    ? (value as ImageFormat)
    : "webp";
}
