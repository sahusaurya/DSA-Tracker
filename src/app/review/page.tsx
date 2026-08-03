import { PageHeader } from "@/components/PageHeader";
import { ProblemTable } from "@/components/ProblemTable";
import { getScheduledProblems } from "@/db/queries";

export default async function ReviewPage() {
  const { problems: scheduled, overdue } = await getScheduledProblems();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-8 py-10">
      <PageHeader
        title="Review"
        subtitle={
          scheduled.length === 0
            ? "Nothing scheduled yet"
            : overdue > 0
              ? `${overdue} due now · ${scheduled.length} scheduled`
              : `${scheduled.length} scheduled, soonest first`
        }
      />
      <ProblemTable
        problems={scheduled}
        empty="Open a problem, say how many days until you want to see it again, and it'll show up here."
      />
    </div>
  );
}
