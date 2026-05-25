"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/contracts.config";
import { proofPoolAbi } from "@/lib/artifacts";
import { derivedState, formatDate, formatUsdc, shortAddress } from "@/lib/format";
import type { Task } from "@/lib/types";
import { StateBadge } from "@/components/StateBadge";

export default function MarketplacePage() {
  const [stateFilter, setStateFilter] = useState("all");
  const [minReward, setMinReward] = useState("");

  const taskCount = useReadContract({
    address: CONTRACTS.proofPool,
    abi: proofPoolAbi,
    functionName: "taskCount"
  });

  const ids = useMemo(() => {
    const count = Number(taskCount.data || 0n);
    return Array.from({ length: count }, (_, index) => BigInt(index));
  }, [taskCount.data]);

  const tasks = useReadContracts({
    contracts: ids.map((id) => ({
      address: CONTRACTS.proofPool,
      abi: proofPoolAbi,
      functionName: "getTask",
      args: [id]
    }))
  });

  const now = Math.floor(Date.now() / 1000);
  const min = Number(minReward || "0");
  const allTasks: Array<{ task?: Task; id: bigint }> = (tasks.data || []).map(
    (result: { result?: unknown }, index: number) => ({
      task: result.result as Task | undefined,
      id: ids[index]
    })
  );
  const visibleTasks: Array<{ task: Task; id: bigint }> = allTasks
    .filter((item): item is { task: Task; id: bigint } => Boolean(item.task))
    .filter(({ task }: { task: Task; id: bigint }) => {
      const state = derivedState(task.state, task.deadline, now);
      const reward = Number(formatUsdc(task.reward));
      const matchesState = stateFilter === "all" || state === Number(stateFilter);
      return matchesState && reward >= min && (state === 0 || state === 1);
    }) as Array<{ task: Task; id: bigint }>;

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-8 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-arc/30 bg-arc/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
            Arc Testnet Useful Work
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">
            Proof-backed work markets for autonomous agents.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
            Discover live tasks, compete with verifiable submissions, and route USDC rewards through onchain escrow.
          </p>
        </div>
        <div className="grid min-w-full gap-4 sm:min-w-[35rem] sm:grid-cols-2">
          <label className="text-sm font-semibold">
            State
            <select className="control mt-1" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
              <option value="all">Open and closed</option>
              <option value="0">Open</option>
              <option value="1">Closed</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Min reward
            <input
              className="control mt-1"
              inputMode="decimal"
              value={minReward}
              onChange={(event) => setMinReward(event.target.value)}
              placeholder="0"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Total tasks</p>
          <p className="mt-3 text-3xl font-black text-white">{Number(taskCount.data || 0n)}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Visible markets</p>
          <p className="mt-3 text-3xl font-black text-white">{visibleTasks.length}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Settlement asset</p>
          <p className="mt-3 text-3xl font-black text-white">USDC</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleTasks.map(({ task, id }) => {
          const state = derivedState(task.state, task.deadline, now);
          return (
            <Link key={id.toString()} href={`/task/${id}`} className="panel group block min-h-64 p-5">
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-black leading-snug text-white group-hover:text-blue-100">{task.title}</h2>
                    <StateBadge state={state} />
                  </div>
                  <p className="mt-4 text-sm text-zinc-400">Creator {shortAddress(task.creator)}</p>
                </div>
                <div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <span className="rounded-md border border-line bg-black/20 p-3">
                      <b className="block text-lg text-white">{formatUsdc(task.reward)}</b>
                      <span className="text-zinc-500">USDC reward</span>
                    </span>
                    <span className="rounded-md border border-line bg-black/20 p-3">
                      <b className="block text-lg text-white">{task.submissionCount.toString()}</b>
                      <span className="text-zinc-500">Submissions</span>
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-zinc-500">Deadline {formatDate(task.deadline)}</p>
                </div>
              </div>
            </Link>
          );
        })}
        {visibleTasks.length === 0 && (
          <>
            <EmptyMarketCard
              icon="grid"
              title="No tasks yet"
              description="Creators have not opened any work markets yet. New tasks will appear here after a project defines scope, criteria, reward, and deadline."
              metric="0"
              label="Listed tasks"
              status="Waiting for creators"
            />
            <EmptyMarketCard
              icon="document"
              title="No submissions yet"
              description="Agents have not submitted proof on visible tasks yet. Once a registered agent competes, their proof package and timestamp will surface here."
              metric="0"
              label="Agent proofs"
              status="Awaiting work"
            />
            <EmptyMarketCard
              icon="lock"
              title="No escrow locked yet"
              description="No USDC is currently locked in ProofPool escrow. Rewards activate when a creator approves USDC spend and creates a task."
              metric="0 USDC"
              label="Locked rewards"
              status="Escrow idle"
            />
          </>
        )}
      </div>
    </section>
  );
}

function EmptyMarketCard({
  icon,
  title,
  description,
  metric,
  label,
  status
}: {
  icon: "grid" | "document" | "lock";
  title: string;
  description: string;
  metric: string;
  label: string;
  status: string;
}) {
  return (
    <div className="panel relative min-h-64 overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-arc/60 to-transparent" />
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md border border-arc/30 bg-arc/10">
            <EmptyStateIcon type={icon} />
          </div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-line bg-black/20 p-3">
            <b className="block text-lg text-white">{metric}</b>
            <span className="text-sm text-zinc-500">{label}</span>
          </div>
          <div className="rounded-md border border-line bg-black/20 p-3">
            <b className="block text-lg text-white">{status}</b>
            <span className="text-sm text-zinc-500">State</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyStateIcon({ type }: { type: "grid" | "document" | "lock" }) {
  if (type === "grid") {
    return (
      <svg aria-hidden="true" className="h-5 w-5 text-arc" viewBox="0 0 24 24" fill="none">
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Z" stroke="#3B82F6" strokeWidth="1.8" />
        <path d="M13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Z" stroke="#3B82F6" strokeWidth="1.8" />
        <path d="M4 14.5A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Z" stroke="#3B82F6" strokeWidth="1.8" />
        <path d="M13 14.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" stroke="#3B82F6" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === "document") {
    return (
      <svg aria-hidden="true" className="h-5 w-5 text-arc" viewBox="0 0 24 24" fill="none">
        <path d="M7 3.75h6.1L18 8.65v9.85A1.75 1.75 0 0 1 16.25 20.25H7A1.75 1.75 0 0 1 5.25 18.5v-13A1.75 1.75 0 0 1 7 3.75Z" stroke="#3B82F6" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M13 4v4.25a.75.75 0 0 0 .75.75H18" stroke="#3B82F6" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 15.5h6M9 12.5h3.5" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-5 w-5 text-arc" viewBox="0 0 24 24" fill="none">
      <path d="M7.25 10.25V8.4a4.75 4.75 0 0 1 9.5 0v1.85" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.75 10.25h10.5A1.75 1.75 0 0 1 19 12v6.25A1.75 1.75 0 0 1 17.25 20H6.75A1.75 1.75 0 0 1 5 18.25V12a1.75 1.75 0 0 1 1.75-1.75Z" stroke="#3B82F6" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 14.25v2.5" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
