import { getLists } from "@/db/queries";
import { getSidebarState } from "@/lib/prefs.server";
import { SidebarNav } from "./SidebarNav";

export async function Sidebar() {
  const [lists, sidebar] = await Promise.all([getLists(), getSidebarState()]);
  return <SidebarNav lists={lists} initialWidth={sidebar.width} initialCollapsed={sidebar.collapsed} />;
}
