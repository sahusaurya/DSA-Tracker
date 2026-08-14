import "server-only";

import { cookies } from "next/headers";
import {
  IMAGE_FORMAT_COOKIE,
  SIDEBAR_COLLAPSED_COOKIE,
  SIDEBAR_WIDTH_COOKIE,
  VIEW_MODES,
  type ImageFormat,
  type ViewMode,
  parseImageFormat,
  parseSidebarWidth,
} from "./prefs";

/** Read server-side so the editor renders in the right mode on the first paint. */
export async function getViewMode(): Promise<ViewMode> {
  const stored = (await cookies()).get("notesView")?.value as ViewMode | undefined;
  return stored && VIEW_MODES.includes(stored) ? stored : "edit";
}

export async function getImageFormat(): Promise<ImageFormat> {
  return parseImageFormat((await cookies()).get(IMAGE_FORMAT_COOKIE)?.value);
}

/** Read server-side so the sidebar paints at its saved size, with no jump on first frame. */
export async function getSidebarState() {
  const jar = await cookies();
  return {
    width: parseSidebarWidth(jar.get(SIDEBAR_WIDTH_COOKIE)?.value),
    collapsed: jar.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1",
  };
}
