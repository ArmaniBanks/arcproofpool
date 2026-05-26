"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ARC_TESTNET, CONTRACTS } from "@/contracts.config";
import { erc20Abi, proofPoolAbi } from "@/lib/artifacts";
import { formatUsdc, parseUsdc } from "@/lib/format";
import { FaucetHelper } from "@/components/FaucetHelper";
import { getReadableTxError, TxStatus } from "@/components/TxStatus";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DRAFT_STORAGE_KEY = "arcproofpool:create-task-draft";
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const TIME_FORMAT = /^\d{2}:\d{2}$/;

export default function CreateTaskPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [title, setTitle] = useState("Analyze suspicious Arc wallet activity");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [reward, setReward] = useState("5");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [createAttempted, setCreateAttempted] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [allowanceRefreshing, setAllowanceRefreshing] = useState(false);

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
  const refetchAllowance = allowance.refetch;

  const allowanceAmount = allowance.data as bigint | undefined;
  const isApproved = Boolean(rewardUnits > 0n && allowanceAmount !== undefined && allowanceAmount >= rewardUnits);
  const approvalStatusLoading = Boolean(isConnected && !isWrongChain && !isApproved && (allowance.isLoading || allowance.isRefetching || allowanceRefreshing));
  const usdcBalance = balance.data as bigint | undefined;
  const hasBalance = usdcBalance !== undefined && usdcBalance >= rewardUnits;
  const rewardLooksValid = /^\d+(\.\d{1,6})?$/.test(reward.trim()) && rewardUnits > 0n;
  const deadlineDateValid = isValidDateInput(deadlineDate);
  const deadlineTimeValid = isValidTimeInput(deadlineTime);
  const deadlineMs = deadlineDateValid && deadlineTimeValid ? getDeadlineMs(deadlineDate, deadlineTime) : undefined;
  const deadlineIsValid = Boolean(deadlineMs && Number.isFinite(deadlineMs) && deadlineMs > Date.now());
  const deadlineSeconds = deadlineIsValid ? BigInt(Math.floor((deadlineMs as number) / 1000)) : 0n;

  const fieldErrors = [
    !title.trim() && "Title is required.",
    !description.trim() && "Description is required.",
    !criteria.trim() && "Acceptance criteria are required.",
    !reward.trim() && "Reward is required.",
    reward.trim() && !rewardLooksValid && "Reward must be greater than 0 with up to 6 USDC decimals.",
    !deadlineDate.trim() && "Deadline date is required.",
    !deadlineTime.trim() && "Deadline time is required.",
    deadlineDate.trim() && !deadlineDateValid && "Deadline date must be YYYY-MM-DD",
    deadlineTime.trim() && !deadlineTimeValid && "Deadline time must be HH:MM",
    deadlineDateValid && deadlineTimeValid && !deadlineIsValid && "Deadline must be in the future"
  ].filter(Boolean) as string[];
  const walletErrors = [
    !isConnected && "Connect a wallet before creating a task.",
    isWrongChain && `Switch to ${ARC_TESTNET.name} before sending transactions.`,
    isConnected && !isWrongChain && usdcBalance === undefined && "USDC balance is still loading.",
    isConnected && !isWrongChain && rewardLooksValid && usdcBalance !== undefined && !hasBalance && `Insufficient USDC balance. Wallet has ${formatUsdc(usdcBalance)} USDC.`
  ].filter(Boolean) as string[];
  const baseCreateErrors = [...fieldErrors, ...walletErrors];
  const approvalRequirementErrors = isApproved
    ? []
    : [
        approvalStatusLoading && "USDC approval status is still loading.",
        rewardLooksValid && !approvalStatusLoading && "USDC approval is missing. Complete Step 1 before creating the task."
      ].filter(Boolean) as string[];
  const approvalErrors = [
    ...fieldErrors,
    ...walletErrors
  ];
  const createErrors = [
    ...baseCreateErrors,
    ...approvalRequirementErrors
  ];

  const canApprove = approvalErrors.length === 0 && !isApproved && !allowanceRefreshing && !approve.isPending && !approveReceipt.isLoading;
  const canCreate = createErrors.length === 0 && !create.isPending && !createReceipt.isLoading;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) {
        setDraftHydrated(true);
        return;
      }
      const draft = JSON.parse(stored) as Partial<Record<"title" | "description" | "criteria" | "reward" | "deadlineDate" | "deadlineTime", string>>;
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.criteria === "string") setCriteria(draft.criteria);
      if (typeof draft.reward === "string") setReward(draft.reward);
      if (typeof draft.deadlineDate === "string") setDeadlineDate(draft.deadlineDate);
      if (typeof draft.deadlineTime === "string") setDeadlineTime(draft.deadlineTime);
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const draft = { title, description, criteria, reward, deadlineDate, deadlineTime };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [criteria, deadlineDate, deadlineTime, description, draftHydrated, reward, title]);

  useEffect(() => {
    if (address && !isWrongChain) {
      refetchAllowance();
    }
  }, [address, isWrongChain, refetchAllowance, rewardUnits]);

  useEffect(() => {
    if (!address || isWrongChain) return;

    function refetchOnFocus() {
      refetchAllowance();
    }

    window.addEventListener("focus", refetchOnFocus);
    document.addEventListener("visibilitychange", refetchOnFocus);

    return () => {
      window.removeEventListener("focus", refetchOnFocus);
      document.removeEventListener("visibilitychange", refetchOnFocus);
    };
  }, [address, isWrongChain, refetchAllowance]);

  useEffect(() => {
    if (!approveReceipt.isSuccess || !address || isWrongChain || rewardUnits <= 0n) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function pollAllowance(attempt = 0) {
      setAllowanceRefreshing(true);
      try {
        const result = await refetchAllowance();
        const nextAllowance = result.data as bigint | undefined;
        if (cancelled) return;
        if (nextAllowance !== undefined && nextAllowance >= rewardUnits) {
          setCreateAttempted(false);
          setAllowanceRefreshing(false);
          return;
        }
      } catch {
        if (cancelled) return;
      }

      if (attempt >= 14) {
        setAllowanceRefreshing(false);
        return;
      }

      timer = setTimeout(() => {
        pollAllowance(attempt + 1);
      }, 1_500);
    }

    pollAllowance();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [address, approveReceipt.isSuccess, isWrongChain, refetchAllowance, rewardUnits]);

  useEffect(() => {
    if (isApproved) {
      setAllowanceRefreshing(false);
    }
  }, [isApproved]);

  useEffect(() => {
    if (createReceipt.isSuccess) {
      balance.refetch();
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
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
            {address && allowanceAmount !== undefined && rewardLooksValid && (
              <p className={`text-xs ${isApproved ? "text-blue-200" : "text-zinc-500"}`}>
                Current allowance: {formatUsdc(allowanceAmount)} USDC
              </p>
            )}
            <FaucetHelper />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Deadline date
              <input
                className="control mt-1"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                value={deadlineDate}
                onChange={(event) => setDeadlineDate(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Deadline time
              <input
                className="control mt-1"
                inputMode="numeric"
                placeholder="HH:MM"
                value={deadlineTime}
                onChange={(event) => setDeadlineTime(event.target.value)}
                required
              />
            </label>
            <p className="text-xs leading-5 text-zinc-500 sm:col-span-2">
              Use future date and time. Example: 2026-05-27, 18:30
            </p>
          </div>
        </div>

        <ValidationPanel
          title="Create task readiness"
          errors={createAttempted ? createErrors : isApproved ? baseCreateErrors : [...baseCreateErrors, ...approvalRequirementErrors]}
          success={baseCreateErrors.length === 0 ? (isApproved ? "Ready to create task." : approvalStatusLoading ? "Checking USDC approval..." : "Fields are valid. Complete USDC approval next.") : undefined}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!canApprove}
            onClick={() => {
              if (!canApprove) return;
              approve.writeContract({
                address: CONTRACTS.usdc,
                abi: erc20Abi,
                functionName: "approve",
                args: [CONTRACTS.proofPool, rewardUnits]
              });
            }}
          >
            {approve.isPending || approveReceipt.isLoading || allowanceRefreshing ? "1. Approving..." : isApproved ? "1. USDC approved" : "1. Approve USDC"}
          </button>
          <button className="btn btn-primary" type="submit" disabled={!canCreate}>
            {create.isPending || createReceipt.isLoading ? "2. Creating..." : "2. Create task"}
          </button>
        </div>
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

function isValidDateInput(value: string) {
  const trimmed = value.trim();
  if (!DATE_FORMAT.test(trimmed)) return false;
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidTimeInput(value: string) {
  const trimmed = value.trim();
  if (!TIME_FORMAT.test(trimmed)) return false;
  const [hour, minute] = trimmed.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function getDeadlineMs(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.trim().split("-").map(Number);
  const [hour, minute] = timeValue.trim().split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0).getTime();
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
