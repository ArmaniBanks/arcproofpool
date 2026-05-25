"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/contracts.config";
import { proofPoolAbi } from "@/lib/artifacts";
import { derivedState, formatUsdc } from "@/lib/format";
import type { Submission, Task } from "@/lib/types";
import { HowItWorks } from "@/components/HowItWorks";
import { StateBadge, SubmissionBadge } from "@/components/StateBadge";

export default function DashboardPage() {
  const { address } = useAccount();
  const taskCount = useReadContract({
    address: CONTRACTS.proofPool,
    abi: proofPoolAbi,
    functionName: "taskCount"
  });
  const ids = useMemo(() => Array.from({ length: Number(taskCount.data || 0n) }, (_, i) => BigInt(i)), [taskCount.data]);
  const taskReads = useReadContracts({
    contracts: ids.map((id) => ({ address: CONTRACTS.proofPool, abi: proofPoolAbi, functionName: "getTask", args: [id] })),
  });
  const submissionReads = useReadContracts({
    contracts: ids.map((id) => ({ address: CONTRACTS.proofPool, abi: proofPoolAbi, functionName: "getSubmissions", args: [id] })),
  });

  const now = Math.floor(Date.now() / 1000);
  const tasks: Array<{ id: bigint; task?: Task }> = (taskReads.data || []).map((result: { result?: unknown }, index: number) => ({
    id: ids[index],
    task: result.result as Task | undefined
  }));
  const created: Array<{ id: bigint; task?: Task }> = tasks.filter(({ task }) => address && task?.creator.toLowerCase() === address.toLowerCase());
  const proofs: Array<{ submission: Submission; taskId: bigint; task?: Task }> = (submissionReads.data || []).flatMap((result: { result?: unknown }, index: number) =>
    ((result.result as Submission[] | undefined) || [])
      .filter((submission) => address && submission.agent.toLowerCase() === address.toLowerCase())
      .map((submission) => ({ submission, taskId: ids[index], task: tasks[index]?.task }))
  );

  return (
    <section className="space-y-10">
      <div>
        <p className="mb-3 inline-flex rounded-full border border-arc/30 bg-arc/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
          Wallet command center
        </p>
        <h1 className="text-4xl font-black text-white">Dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Connected wallet activity from the live contracts.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-black">Tasks Created</h2>
        {created.map(({ id, task }) => (
          <Link key={id.toString()} href={`/task/${id}`} className="panel flex items-center justify-between p-5">
            <span className="font-bold">{task!.title}</span>
            <span className="flex items-center gap-3 text-sm">
              {formatUsdc(task!.reward)} USDC
              <StateBadge state={derivedState(task!.state, task!.deadline, now)} />
            </span>
          </Link>
        ))}
        {created.length === 0 && <div className="panel p-6 text-sm text-zinc-400">No created tasks for this wallet. Created markets will appear here after escrow is locked.</div>}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">Proofs Submitted</h2>
        {proofs.map(({ taskId, task, submission }) => (
          <Link key={`${taskId}-${submission.agent}`} href={`/task/${taskId}`} className="panel block p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">{task?.title || `Task ${taskId.toString()}`}</span>
              <SubmissionBadge status={submission.status} />
            </div>
            <p className="mt-2 truncate text-sm text-zinc-400">{submission.proof}</p>
          </Link>
        ))}
        {proofs.length === 0 && <div className="panel p-6 text-sm text-zinc-400">No submitted proofs for this wallet. Agent submissions and outcomes will collect here.</div>}
      </section>

      {created.length === 0 && proofs.length === 0 && (
        <div className="space-y-6">
          <DemoPathPrompt />
          <div className="panel p-6">
            <HowItWorks compact />
          </div>
        </div>
      )}
    </section>
  );
}

function DemoPathPrompt() {
  return (
    <div className="mx-auto max-w-xl rounded-md border border-line bg-white/[0.02] px-6 py-5 text-center text-sm text-zinc-500">
      Run the demo path to generate live events.{" "}
      <Link href="/create-task" className="font-black text-blue-300 hover:text-blue-100">
        Create a task
      </Link>
    </div>
  );
}
