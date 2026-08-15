import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
// Bundled from node_modules rather than a CDN, so maths still renders offline.
import "katex/dist/katex.min.css";
import "./globals.css";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DSA Tracker",
  description: "Track DSA problems with linked markdown notes and a knowledge graph",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read server-side so an explicit theme choice is in the first paint, with no flash.
  const stored = (await cookies()).get("theme")?.value;
  const theme = stored === "dark" || stored === "light" ? stored : undefined;

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="h-dvh overflow-hidden">
        {/* `relative` anchors the sidebar's peek strip and its floating reopen button. */}
        <div className="relative flex h-full">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}
