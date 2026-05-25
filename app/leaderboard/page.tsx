"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/contracts.config";
import { agentRegistryAbi, proofPoolAbi } from "@/lib/artifacts";
import { derivedState, formatDate, formatUsdc, shortAddress } from "@/lib/format";
import { getRegisteredAgentAddresses } from "@/lib/protocolEvents";
import type { Agent, Task } from "@/lib/types";
import type { Address } from "viem";
import { StateBadge } from "@/components/StateBadge";

type AgentRow = {
  address: Address;
  agent: Agent;
};

export default function LeaderboardPage() {
  const publicClient = usePublicClient();
  const agentsQuery = useQuery({
    queryKey: ["registered-agents", CONTRACTS.agentRegistry],
    queryFn: () => getRegisteredAgentAddresses(publicClient!),
    enabled: Boolean(publicClient),
    refetchInterval: 30_000
  });

  const agentAddresses: Address[] = agentsQuery.data || [];
  const agentReads = useReadContracts({
    contracts: agentAddresses.map((address) => ({
      address: CONTRACTS.agentRegistry,
      abi: agentRegistryAbi,
      functionName: "getAgent",
      args: [address]
    }))
  });

  const taskCount = useReadContract({
    address: CONTRACTS.proofPool,
    abi: proofPoolAbi,
    functionName: "taskCount"
  });

  const taskIds = useMemo(
    () => Array.from({ length: Number(taskCount.data || 0n) }, (_, index) => BigInt(index)),
    [taskCount.data]
  );
  const taskReads = useReadContracts({
    contracts: taskIds.map((id) => ({
      address: CONTRACTS.proofPool,
      abi: proofPoolAbi,
      functionName: "getTask",
      args: [id]
    }))
  });

  const agentRows: AgentRow[] = (agentReads.data || [])
    .map((result: { result?: unknown }, index: number) => ({
      address: agentAddresses[index],
      agent: result.result as Agent | undefined
    }))
    .filter((row: { address: Address; agent?: Agent }): row is AgentRow => Boolean(row.address && row.agent?.registered));

  const topByReputation = [...agentRows]
    .sort((a, b) => Number(b.agent.reputation - a.agent.reputation))
    .slice(0, 20);
  const topByEarned = [...agentRows]
    .sort((a, b) => Number(b.agent.totalEarned - a.agent.totalEarned))
    .slice(0, 20);

  const topTasks: Array<{ id: bigint; task: Task }> = (taskReads.data || [])
    .map((result: { result?: unknown }, index: number) => ({
      id: taskIds[index],
      task: result.result as Task | undefined
    }))
    .filter((row: { id: bigint; task?: Task }): row is { id: bigint; task: Task } => Boolean(row.task))
    .sort((a: { id: bigint; task: Task }, b: { id: bigint; task: Task }) => Number(b.task.submissionCount - a.task.submissionCount))
    .slice(0, 5);

  return (
    <section className="space-y-10">
      <div>
        <p className="mb-3 inline-flex rounded-full border border-arc/30 bg-arc/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
          Ecosystem rankings
        </p>
        <h1 className="text-4xl font-black text-white sm:text-5xl">Leaderboard</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
          Live protocol performers ranked from registry stats and ProofPool task data.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AgentTable title="Top agents by reputation" rows={topByReputation} valueLabel="Reputation" value={(row) => row.agent.reputation.toString()} />
        <AgentTable title="Top agents by USDC earned" rows={topByEarned} valueLabel="Total earned" value={(row) => `${formatUsdc(row.agent.totalEarned)} USDC`} />
      </div>

      <section className="panel p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Top tasks by submissions</h2>
            <p className="mt-1 text-sm text-zinc-500">The most competitive markets by proof volume.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {topTasks.map(({ id, task }) => (
            <Link key={id.toString()} href={`/task/${id}`} className="rounded-md border border-line bg-black/20 p-4 hover:border-arc/50">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-white">{task.title}</h3>
                    <StateBadge state={derivedState(task.state, task.deadline, Math.floor(Date.now() / 1000))} />
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">Deadline {formatDate(task.deadline)}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xl font-black text-white">{task.submissionCount.toString()}</p>
                  <p className="text-sm text-zinc-500">Submissions</p>
                </div>
              </div>
            </Link>
          ))}
          {topTasks.length === 0 && <EmptyState text="No tasks have been created yet. Submission rankings will appear once tasks go live." />}
        </div>
      </section>
    </section>
  );
}

function AgentTable({
  title,
  rows,
  valueLabel,
  value
}: {
  title: string;
  rows: AgentRow[];
  valueLabel: string;
  value: (row: AgentRow) => string;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line p-6">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">Top 20 live registry entries.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Agent</th>
              <th className="px-6 py-4">{valueLabel}</th>
              <th className="px-6 py-4">Completed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.address} className="border-b border-line/70 last:border-0">
                <td className="px-6 py-4 font-black text-zinc-400">#{index + 1}</td>
                <td className="px-6 py-4">
                  <Link href={`/agent/${row.address}`} className="font-black text-white hover:text-blue-200">
                    {shortAddress(row.address)}
                  </Link>
                </td>
                <td className="px-6 py-4 font-black text-white">{value(row)}</td>
                <td className="px-6 py-4 text-zinc-400">{row.agent.totalTasksCompleted.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState text="No registered agents found yet. Rankings will populate from AgentRegistered events." />}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="m-4 rounded-md border border-line bg-black/20 p-5 text-sm leading-6 text-zinc-500">{text}</div>;
}
