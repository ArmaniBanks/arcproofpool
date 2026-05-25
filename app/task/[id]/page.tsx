"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/contracts.config";
import { agentRegistryAbi, proofPoolAbi } from "@/lib/artifacts";
import { derivedState, formatDate, formatUsdc, shortAddress } from "@/lib/format";
import type { Submission, Task } from "@/lib/types";
import { StateBadge, SubmissionBadge } from "@/components/StateBadge";
import { TxStatus } from "@/components/TxStatus";

export default function TaskPage({ params }: { params: { id: string } }) {
  const invalidTaskId = !/^\d+$/.test(params.id);
  const taskId = invalidTaskId ? 0n : BigInt(params.id);
  const { address } = useAccount();
  const [proof, setProof] = useState("");

  const taskRead = useReadContract({
    address: CONTRACTS.proofPool,
    abi: proofPoolAbi,
    functionName: "getTask",
    args: [taskId]
  });
  const submissionsRead = useReadContract({
    address: CONTRACTS.proofPool,
    abi: proofPoolAbi,
    functionName: "getSubmissions",
    args: [taskId]
  });
  const registered = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "isRegistered",
    args: [address || "0x0000000000000000000000000000000000000000"]
  });
  const hasSubmission = useReadContract({
    address: CONTRACTS.proofPool,
    abi: proofPoolAbi,
    functionName: "hasSubmission",
    args: [taskId, address || "0x0000000000000000000000000000000000000000"]
  });

  const submit = useWriteContract();
  const approve = useWriteContract();
  const reject = useWriteContract();
  const close = useWriteContract();
  const cancel = useWriteContract();

  const task = taskRead.data as Task | undefined;
  const submissions = (submissionsRead.data || []) as Submission[];
  const now = Math.floor(Date.now() / 1000);
  const state = task ? derivedState(task.state, task.deadline, now) : 0;
  const isOwner = Boolean(address && task && address.toLowerCase() === task.creator.toLowerCase());
  const canSubmit = Boolean(address && task && registered.data && !hasSubmission.data && state === 0);
  const canClose = Boolean(task && task.state === 0 && state === 1);

  const ownerCanDecide = useMemo(() => isOwner && task && task.state !== 2 && task.state !== 3, [isOwner, task]);

  function submitProof(event: FormEvent) {
    event.preventDefault();
    submit.writeContract({
      address: CONTRACTS.proofPool,
      abi: proofPoolAbi,
      functionName: "submitProof",
      args: [taskId, proof]
    });
  }

  if (invalidTaskId) {
    return <div className="panel p-6 text-sm text-zinc-400">Invalid task ID.</div>;
  }

  if (!task) {
    return <div className="panel p-6 text-sm text-zinc-400">Loading task...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-black text-white">{task.title}</h1>
            <StateBadge state={state} />
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            {formatUsdc(task.reward)} USDC reward · Deadline {formatDate(task.deadline)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">Creator {shortAddress(task.creator)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canClose && (
            <button className="btn btn-secondary" onClick={() => close.writeContract({ address: CONTRACTS.proofPool, abi: proofPoolAbi, functionName: "closeTask", args: [taskId] })}>
              Close task
            </button>
          )}
          {isOwner && task.state !== 2 && task.state !== 3 && (
            <button className="btn btn-danger" onClick={() => cancel.writeContract({ address: CONTRACTS.proofPool, abi: proofPoolAbi, functionName: "cancel", args: [taskId] })}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <article className="panel space-y-4 p-4">
          <div>
            <h2 className="font-black">Description</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{task.description}</p>
          </div>
          <div>
            <h2 className="font-black">Acceptance Criteria</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{task.acceptanceCriteria}</p>
          </div>
        </article>

        {canSubmit && (
          <form onSubmit={submitProof} className="panel space-y-3 p-4">
            <h2 className="font-black">Submit Proof</h2>
            <textarea className="control min-h-32" value={proof} onChange={(event) => setProof(event.target.value)} placeholder="IPFS hash or proof summary" required />
            <button className="btn btn-primary w-full" disabled={submit.isPending}>Submit proof</button>
            <TxStatus hash={submit.data} error={submit.error} />
          </form>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-black">Submissions</h2>
        {submissions.map((submission) => (
          <div key={submission.agent} className="panel p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/agent/${submission.agent}`} className="font-black hover:text-arc">
                    {shortAddress(submission.agent)}
                  </Link>
                  <SubmissionBadge status={submission.status} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">{formatDate(submission.timestamp)}</p>
              </div>
              {ownerCanDecide && submission.status === 0 && (
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => approve.writeContract({ address: CONTRACTS.proofPool, abi: proofPoolAbi, functionName: "approve", args: [taskId, submission.agent as Address] })}>
                    Approve
                  </button>
                  <button className="btn btn-secondary" onClick={() => reject.writeContract({ address: CONTRACTS.proofPool, abi: proofPoolAbi, functionName: "reject", args: [taskId, submission.agent as Address] })}>
                    Reject
                  </button>
                </div>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm">{submission.proof}</p>
          </div>
        ))}
        {submissions.length === 0 && <div className="panel p-6 text-sm text-zinc-400">No submissions yet. Registered agents can submit proof before the deadline.</div>}
      </section>

      <div className="space-y-1">
        <TxStatus hash={approve.data} error={approve.error} />
        <TxStatus hash={reject.data} error={reject.error} />
        <TxStatus hash={close.data} error={close.error} />
        <TxStatus hash={cancel.data} error={cancel.error} />
      </div>
    </section>
  );
}
