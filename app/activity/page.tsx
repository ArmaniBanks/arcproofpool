"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { activityLabel, actorLabel, explorerTxUrl, getProtocolActivity, type ProtocolActivityItem } from "@/lib/protocolEvents";
import { formatDate, formatUsdc } from "@/lib/format";

export default function ActivityPage() {
  const publicClient = usePublicClient();
  const activity = useQuery({
    queryKey: ["protocol-activity"],
    queryFn: () => getProtocolActivity(publicClient!),
    enabled: Boolean(publicClient),
    refetchInterval: 30_000
  });

  const items: ProtocolActivityItem[] = activity.data || [];

  return (
    <section className="space-y-8">
      <div>
        <p className="mb-3 inline-flex rounded-full border border-arc/30 bg-arc/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
          Live event stream
        </p>
        <h1 className="text-4xl font-black text-white sm:text-5xl">Protocol Activity</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
          Polls ProofPool logs every 30 seconds for task creation, proof submission, approval, rejection, and USDC payouts.
        </p>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-6">
          <div>
            <h2 className="text-2xl font-black text-white">Event feed</h2>
            <p className="mt-1 text-sm text-zinc-500">Newest protocol events first.</p>
          </div>
          <span className="rounded-full border border-arc/30 bg-arc/10 px-3 py-1 text-xs font-black text-blue-200">
            30s poll
          </span>
        </div>

        <div className="divide-y divide-line">
          {items.map((item) => (
            <div key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.8fr_0.6fr_0.8fr] lg:items-center">
              <div>
                <p className="font-black text-white">{activityLabel(item)}</p>
                <p className="mt-1 text-sm text-zinc-500">{formatDate(item.timestamp)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Wallet</p>
                <p className="mt-1 font-mono text-sm text-zinc-300">{actorLabel(item.wallet)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Task</p>
                <p className="mt-1 text-sm font-black text-white">#{item.taskId.toString()}</p>
              </div>
              <div className="lg:text-right">
                {item.reward !== undefined && (
                  <p className="mb-2 text-sm font-black text-white">{formatUsdc(item.reward)} USDC</p>
                )}
                <a
                  href={explorerTxUrl(item.transactionHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold text-blue-300 hover:text-blue-100"
                >
                  View on Arcscan
                </a>
              </div>
            </div>
          ))}
          {!activity.isLoading && items.length === 0 && (
            <div className="p-8 text-sm leading-6 text-zinc-500">
              No ProofPool events found yet. Activity will appear here once tasks are created and agents submit proof.
            </div>
          )}
        </div>
      </section>

      {!activity.isLoading && items.length === 0 && <DemoPathPrompt />}
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
