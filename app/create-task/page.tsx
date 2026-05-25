"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/contracts.config";
import { erc20Abi, proofPoolAbi } from "@/lib/artifacts";
import { parseUsdc } from "@/lib/format";
import { FaucetHelper } from "@/components/FaucetHelper";
import { TxStatus } from "@/components/TxStatus";

export default function CreateTaskPage() {
  const { address } = useAccount();
  const [title, setTitle] = useState("Analyze suspicious Arc wallet activity");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [reward, setReward] = useState("50");
  const [deadline, setDeadline] = useState("");

  const rewardUnits = useMemo(() => parseUsdc(reward), [reward]);
  const allowance = useReadContract({
    address: CONTRACTS.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address || "0x0000000000000000000000000000000000000000", CONTRACTS.proofPool]
  });
  const approve = useWriteContract();
  const create = useWriteContract();

  const hasAllowance = (allowance.data as bigint | undefined) !== undefined && (allowance.data as bigint) >= rewardUnits;
  const deadlineSeconds = deadline ? BigInt(Math.floor(new Date(deadline).getTime() / 1000)) : 0n;

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    create.writeContract({
      address: CONTRACTS.proofPool,
      abi: proofPoolAbi,
      functionName: "createTask",
      args: [title, description, criteria, rewardUnits, deadlineSeconds]
    });
  }

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="mb-3 inline-flex rounded-full border border-arc/30 bg-arc/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
          Escrow launch
        </p>
        <h1 className="text-4xl font-black text-white">Create Task</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Approve USDC first, then lock the reward in escrow.</p>
      </div>

      <form onSubmit={submitCreate} className="panel space-y-5 p-6">
        <label className="block text-sm font-semibold">
          Title
          <input className="control mt-1" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="block text-sm font-semibold">
          Description
          <textarea className="control mt-1 min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} required />
        </label>
        <label className="block text-sm font-semibold">
          Acceptance criteria
          <textarea className="control mt-1 min-h-24" value={criteria} onChange={(event) => setCriteria(event.target.value)} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              Reward, USDC
              <input className="control mt-1" inputMode="decimal" value={reward} onChange={(event) => setReward(event.target.value)} required />
            </label>
            <FaucetHelper />
          </div>
          <label className="block text-sm font-semibold">
            Deadline
            <input className="control mt-1" type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} required />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!address || rewardUnits <= 0n || approve.isPending}
            onClick={() =>
              approve.writeContract({
                address: CONTRACTS.usdc,
                abi: erc20Abi,
                functionName: "approve",
                args: [CONTRACTS.proofPool, rewardUnits]
              })
            }
          >
            1. Approve USDC
          </button>
          <button className="btn btn-primary" type="submit" disabled={!address || !hasAllowance || create.isPending}>
            2. Create task
          </button>
        </div>
        <TxStatus hash={approve.data} error={approve.error} />
        <TxStatus hash={create.data} error={create.error} />
      </form>
    </section>
  );
}
