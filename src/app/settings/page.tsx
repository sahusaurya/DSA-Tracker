import { ImageFormatSetting } from "@/components/ImageFormatSetting";
import { PageHeader } from "@/components/PageHeader";
import { getImageFormat } from "@/lib/prefs.server";

export default async function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
      <PageHeader
        title="Settings"
        subtitle="Kept in this browser, not in your vault — so exports and clones aren't affected."
      />
      <ImageFormatSetting initial={await getImageFormat()} />
    </div>
  );
}
