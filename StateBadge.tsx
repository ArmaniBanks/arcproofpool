import { stateLabels, submissionLabels } from "@/lib/format";

const stateClass = [
  "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "border-arc/40 bg-arc/10 text-blue-100",
  "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
];
const submissionClass = [
  "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "border-arc/40 bg-arc/10 text-blue-100",
  "border-red-400/30 bg-red-400/10 text-red-200",
  "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
];

export function StateBadge({ state }: { state: number }) {
  return (
    <span className={`whitespace-nowrap rounded border px-2 py-1 text-xs font-black ${stateClass[state] || "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"}`}>
      {stateLabels[state] || "UNKNOWN"}
    </span>
  );
}

export function SubmissionBadge({ status }: { status: number }) {
  return (
    <span
      className={`whitespace-nowrap rounded border px-2 py-1 text-xs font-black ${submissionClass[status] || "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"}`}
    >
      {submissionLabels[status] || "UNKNOWN"}
    </span>
  );
}
