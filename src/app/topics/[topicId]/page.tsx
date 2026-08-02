import { NodePage } from "@/components/NodePage";

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  return <NodePage id={topicId} kind="topic" />;
}
