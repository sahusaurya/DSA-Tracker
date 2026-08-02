import { getLists } from "@/db/queries";
import { SidebarNav } from "./SidebarNav";

export async function Sidebar() {
  const lists = await getLists();
  return <SidebarNav lists={lists} />;
}
