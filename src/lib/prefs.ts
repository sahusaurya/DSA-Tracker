export type ViewMode = "edit" | "split" | "preview";
export const VIEW_MODES: ViewMode[] = ["edit", "split", "preview"];

/** What a pasted screenshot is stored as. Files chosen from disk are never re-encoded. */
export type ImageFormat = "webp" | "png";
export const IMAGE_FORMATS: ImageFormat[] = ["webp", "png"];
export const IMAGE_FORMAT_COOKIE = "imageFormat";

export function parseImageFormat(value: string | undefined): ImageFormat {
  return value && (IMAGE_FORMATS as string[]).includes(value)
    ? (value as ImageFormat)
    : "webp";
}
