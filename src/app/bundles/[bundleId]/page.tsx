import { NodePage } from "@/components/NodePage";

export default async function BundlePage({ params }: { params: Promise<{ bundleId: string }> }) {
  const { bundleId } = await params;
  return <NodePage id={bundleId} kind="bundle" />;
}
