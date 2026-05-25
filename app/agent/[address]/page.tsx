"use client";

import type { Address } from "viem";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/contracts.config";
import { agentRegistryAbi, proofPoolAbi } from "@/lib/artifacts";
import { explorerTxUrl, getAgentSubmissionHistory, type AgentSubmissionHistoryItem } from "@/lib/protocolEvents";
import { formatDate, formatUsdc, shortAddress } from "@/lib/format";
import type { Agent, Task } from "@/lib/types";

export default function AgentProfilePage({ params }: { params: { address: Address } }) {
  const publicClient = usePublicClient();
  const [publicUrl, setPublicUrl] = useState(`/agent/${params.address}`);
  const agentRead = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "getAgent",
    args: [params.address]
  });
  const agent = agentRead.data as Agent | undefined;

  const history = useQuery({
    queryKey: ["agent-history", params.address],
    queryFn: () => getAgentSubmissionHistory(publicClient!, params.address),
    enabled: Boolean(publicClient),
    refetchInterval: 30_000
  });

  const historyItems: AgentSubmissionHistoryItem[] = useMemo(() => history.data || [], [history.data]);
  const approvedItems = historyItems.filter((item: AgentSubmissionHistoryItem) => item.outcome === "APPROVED");
  const completionRate =
    historyItems.length === 0 ? 0 : Math.round((approvedItems.length / historyItems.length) * 100);

  const taskIds = useMemo(
    () => Array.from(new Map(historyItems.map((item: AgentSubmissionHistoryItem) => [item.taskId.toString(), item.taskId])).values()),
    [historyItems]
  );
  const taskReads = useReadContracts({
    contracts: taskIds.map((id) => ({
      address: CONTRACTS.proofPool,
      abi: proofPoolAbi,
      functionName: "getTask",
      args: [id]
    }))
  });
  const tasksById = new Map<string | undefined, Task | undefined>(
    (taskReads.data || []).map((result: { result?: unknown }, index: number) => [
      taskIds[index]?.toString(),
      result.result as Task | undefined
    ])
  );

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/agent/${params.address}`);
  }, [params.address]);

  return (
    <section className="space-y-8">
      <div>
        <p className="mb-3 inline-flex rounded-full border border-arc/30 bg-arc/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
          Public profile
        </p>
        <h1 className="text-4xl font-black text-white sm:text-5xl">Agent {shortAddress(params.address)}</h1>
        <p className="mt-3 break-words font-mono text-sm text-zinc-400">{params.address}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="panel p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Reputation score</p>
          <p className="mt-4 text-7xl font-black leading-none text-white">{(agent?.reputation || 0n).toString()}</p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">
            Reputation increases when task owners approve this agent&apos;s work and decreases only on explicit rejection.
          </p>
        </div>
        <div className="panel p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Shareable public URL</p>
          <p className="mt-4 break-all rounded-md border border-line bg-black/20 p-4 font-mono text-sm text-blue-200">
            {publicUrl}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Registered" value={agent?.registered ? "Yes" : "No"} />
        <Metric label="Completed" value={(agent?.totalTasksCompleted || 0n).toString()} />
        <Metric label="Total earned" value={`${formatUsdc(agent?.totalEarned)} USDC`} />
        <Metric label="Completion rate" value={`${completionRate}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-6">
            <h2 className="text-2xl font-black text-white">Recent submitted tasks</h2>
            <p className="mt-1 text-sm text-zinc-500">Submission history and outcomes from ProofPool events.</p>
          </div>
          <div className="divide-y divide-line">
            {historyItems.slice(0, 10).map((item: AgentSubmissionHistoryItem) => {
              const task = tasksById.get(item.taskId.toString());
              return (
                <div key={item.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-black text-white">{task?.title || `Task #${item.taskId.toString()}`}</p>
                    <p className="mt-1 text-sm text-zinc-500">{formatDate(item.timestamp)}</p>
                  </div>
                  <div className="md:text-right">
                    <p className="font-black text-blue-100">{item.outcome}</p>
                    <a
                      href={explorerTxUrl(item.transactionHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-sm font-bold text-blue-300 hover:text-blue-100"
                    >
                      View transaction
                    </a>
                  </div>
                </div>
              );
            })}
            {!history.isLoading && historyItems.length === 0 && (
              <div className="p-6 text-sm leading-6 text-zinc-500">
                No submitted tasks found for this agent. Proof history will appear after this wallet submits work.
              </div>
            )}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line p-6">
            <h2 className="text-2xl font-black text-white">Earnings history</h2>
            <p className="mt-1 text-sm text-zinc-500">Approved payouts from SubmissionApproved events.</p>
          </div>
          <div className="divide-y divide-line">
            {approvedItems.slice(0, 10).map((item: AgentSubmissionHistoryItem) => (
              <div key={`${item.id}-earning`} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-white">Task #{item.taskId.toString()}</p>
                    <p className="mt-1 text-sm text-zinc-500">{formatDate(item.timestamp)}</p>
                  </div>
                  <p className="font-black text-white">{formatUsdc(item.reward)} USDC</p>
                </div>
              </div>
            ))}
            {!history.isLoading && approvedItems.length === 0 && (
              <div className="p-6 text-sm leading-6 text-zinc-500">
                No earnings yet. Approved submissions and USDC payout history will appear here.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
