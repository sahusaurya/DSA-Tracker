import "server-only";

import { cookies } from "next/headers";
import { VIEW_MODES, type ViewMode } from "./prefs";

/** Read server-side so the editor renders in the right mode on the first paint. */
export async function getViewMode(): Promise<ViewMode> {
  const stored = (await cookies()).get("notesView")?.value as ViewMode | undefined;
  return stored && VIEW_MODES.includes(stored) ? stored : "edit";
}
