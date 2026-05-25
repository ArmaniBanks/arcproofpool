"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ARC_TESTNET, CONTRACTS } from "@/contracts.config";
import { erc20Abi, proofPoolAbi } from "@/lib/artifacts";
import { formatUsdc, parseUsdc } from "@/lib/format";
import { FaucetHelper } from "@/components/FaucetHelper";
import { getReadableTxError, TxStatus } from "@/components/TxStatus";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function CreateTaskPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [title, setTitle] = useState("Analyze suspicious Arc wallet activity");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [reward, setReward] = useState("50");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [createAttempted, setCreateAttempted] = useState(false);
  const [approveAttempted, setApproveAttempted] = useState(false);

  const rewardUnits = useMemo(() => parseUsdc(reward), [reward]);
  const isWrongChain = Boolean(isConnected && chainId !== ARC_TESTNET.id);
  const allowance = useReadContract({
    address: CONTRACTS.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address || ZERO_ADDRESS, CONTRACTS.proofPool]
  });
  const balance = useReadContract({
    address: CONTRACTS.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address || ZERO_ADDRESS]
  });
  const approve = useWriteContract();
  const create = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({ hash: approve.data });
  const createReceipt = useWaitForTransactionReceipt({ hash: create.data });

  const hasAllowance = (allowance.data as bigint | undefined) !== undefined && (allowance.data as bigint) >= rewardUnits;
  const usdcBalance = balance.data as bigint | undefined;
  const hasBalance = usdcBalance !== undefined && usdcBalance >= rewardUnits;
  const rewardLooksValid = /^\d+(\.\d{1,6})?$/.test(reward.trim()) && rewardUnits > 0n;
  const deadlineDateTime = deadlineDate && deadlineTime ? new Date(`${deadlineDate}T${deadlineTime}`) : null;
  const deadlineMs = deadlineDateTime?.getTime();
  const deadlineIsValid = Boolean(deadlineMs && Number.isFinite(deadlineMs) && deadlineMs > Date.now());
  const deadlineSeconds = deadlineIsValid ? BigInt(Math.floor((deadlineMs as number) / 1000)) : 0n;

  const fieldErrors = [
    !title.trim() && "Title is required.",
    !description.trim() && "Description is required.",
    !criteria.trim() && "Acceptance criteria are required.",
    !reward.trim() && "Reward is required.",
    reward.trim() && !rewardLooksValid && "Reward must be greater than 0 with up to 6 USDC decimals.",
    !deadlineDate && "Deadline date is required.",
    !deadlineTime && "Deadline time is required.",
    deadlineDate && deadlineTime && !deadlineIsValid && "Deadline must be a valid future date and time."
  ].filter(Boolean) as string[];
  const walletErrors = [
    !isConnected && "Connect a wallet before creating a task.",
    isWrongChain && `Switch to ${ARC_TESTNET.name} before sending transactions.`,
    isConnected && !isWrongChain && usdcBalance === undefined && "USDC balance is still loading.",
    isConnected && !isWrongChain && rewardLooksValid && usdcBalance !== undefined && !hasBalance && `Insufficient USDC balance. Wallet has ${formatUsdc(usdcBalance)} USDC.`
  ].filter(Boolean) as string[];
  const approvalErrors = [
    ...fieldErrors,
    ...walletErrors
  ];
  const createErrors = [
    ...fieldErrors,
    ...walletErrors,
    rewardLooksValid && !hasAllowance && "USDC approval is missing. Complete Step 1 before creating the task."
  ].filter(Boolean) as string[];

  const canApprove = approvalErrors.length === 0 && !approve.isPending && !approveReceipt.isLoading;
  const canCreate = createErrors.length === 0 && !create.isPending && !createReceipt.isLoading;

  useEffect(() => {
    if (approveReceipt.isSuccess) {
      allowance.refetch();
    }
  }, [allowance, approveReceipt.isSuccess]);

  useEffect(() => {
    if (createReceipt.isSuccess) {
      balance.refetch();
    }
  }, [balance, createReceipt.isSuccess]);

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    setCreateAttempted(true);
    if (!canCreate) return;
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
        <p className="mt-3 text-sm leading-6 text-zinc-400">Approve USDC first, then lock the reward in escrow on Arc Testnet.</p>
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
            {address && usdcBalance !== undefined && <p className="text-xs text-zinc-500">Wallet balance: {formatUsdc(usdcBalance)} USDC</p>}
            <FaucetHelper />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Deadline date
              <input className="control mt-1" type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} required />
            </label>
            <label className="block text-sm font-semibold">
              Deadline time
              <input className="control mt-1" type="time" value={deadlineTime} onChange={(event) => setDeadlineTime(event.target.value)} required />
            </label>
          </div>
        </div>

        <ValidationPanel
          title="Create task readiness"
          errors={createAttempted ? createErrors : [...fieldErrors, ...walletErrors]}
          success={fieldErrors.length === 0 && walletErrors.length === 0 ? (hasAllowance ? "Ready to create task." : "Fields are valid. Complete USDC approval next.") : undefined}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!canApprove}
            onClick={() => {
              setApproveAttempted(true);
              if (!canApprove) return;
              approve.writeContract({
                address: CONTRACTS.usdc,
                abi: erc20Abi,
                functionName: "approve",
                args: [CONTRACTS.proofPool, rewardUnits]
              });
            }}
          >
            {approve.isPending || approveReceipt.isLoading ? "1. Approving..." : approveReceipt.isSuccess || hasAllowance ? "1. USDC approved" : "1. Approve USDC"}
          </button>
          <button className="btn btn-primary" type="submit" disabled={!canCreate}>
            {create.isPending || createReceipt.isLoading ? "2. Creating..." : "2. Create task"}
          </button>
        </div>
        {approveAttempted && approvalErrors.length > 0 && <ValidationPanel title="Approval blocked" errors={approvalErrors} />}
        {createAttempted && createErrors.length > 0 && <ValidationPanel title="Create blocked" errors={createErrors} />}
        <TxStatus hash={approve.data} error={approve.error} />
        <TxStatus hash={create.data} error={create.error} />
        {(allowance.error || balance.error) && (
          <div className="rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
            {allowance.error && <p>Allowance read failed: {getReadableTxError(allowance.error)}</p>}
            {balance.error && <p>USDC balance read failed: {getReadableTxError(balance.error)}</p>}
          </div>
        )}
      </form>
    </section>
  );
}

function ValidationPanel({ title, errors, success }: { title: string; errors: string[]; success?: string }) {
  if (errors.length === 0 && !success) return null;

  return (
    <div className={`rounded-md border p-4 text-sm ${errors.length > 0 ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : "border-arc/30 bg-arc/10 text-blue-100"}`}>
      <p className="font-black text-white">{title}</p>
      {errors.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2">{success}</p>
      )}
    </div>
  );
}
