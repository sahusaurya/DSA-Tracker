import { PageHeader } from "@/components/PageHeader";
import { ProblemTable } from "@/components/ProblemTable";
import { getDueProblems } from "@/db/queries";

export default async function ReviewPage() {
  const due = await getDueProblems();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-8 py-10">
      <PageHeader
        title="Review"
        subtitle={
          due.length === 0
            ? "Nothing due right now"
            : `${due.length} problem${due.length === 1 ? "" : "s"} to revisit`
        }
      />
      <ProblemTable
        problems={due}
        empty="Mark a problem reviewed and it'll come back here when it's due."
      />
    </div>
  );
}
