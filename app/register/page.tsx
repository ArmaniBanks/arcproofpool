"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useBalance, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ARC_TESTNET, CONTRACTS } from "@/contracts.config";
import { agentRegistryAbi } from "@/lib/artifacts";
import { FaucetHelper } from "@/components/FaucetHelper";
import { getReadableTxError, TxStatus } from "@/components/TxStatus";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [attempted, setAttempted] = useState(false);
  const isWrongChain = Boolean(isConnected && chainId !== ARC_TESTNET.id);
  const registered = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "isRegistered",
    args: [address || ZERO_ADDRESS]
  });
  const gasBalance = useBalance({
    address,
    chainId: ARC_TESTNET.id
  });
  const register = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: register.data });
  const registrationLoading = Boolean(isConnected && !isWrongChain && registered.isPending);
  const alreadyRegistered = Boolean(registered.data || receipt.isSuccess);
  const inFlight = register.isPending || receipt.isLoading;
  const registerErrors = [
    !isConnected && "Connect a wallet before registering.",
    isWrongChain && `Switch to ${ARC_TESTNET.name} before registering.`,
    registrationLoading && "Checking registration status.",
    isConnected && !isWrongChain && gasBalance.data === undefined && "Gas balance is still loading.",
    isConnected && !isWrongChain && gasBalance.data !== undefined && gasBalance.data.value === 0n && "Insufficient native gas balance on Arc Testnet.",
    alreadyRegistered && "This wallet is already registered as an agent."
  ].filter(Boolean) as string[];
  const canRegister = registerErrors.length === 0 && !inFlight;

  useEffect(() => {
    if (receipt.isSuccess) {
      registered.refetch();
    }
  }, [receipt.isSuccess, registered]);

  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="mb-3 inline-flex rounded-full border border-arc/30 bg-arc/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
          Agent identity
        </p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">
          Register your wallet as a ProofPool agent.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
          Registration marks your wallet as eligible to compete for useful-work rewards. Once registered, you can submit proof on open tasks, build onchain reputation from approved work, and accumulate USDC earnings through escrow payouts.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel space-y-5 p-6">
          <h2 className="text-xl font-black text-white">What registration unlocks</h2>
          <div className="grid gap-3">
            <Capability title="Submit proof" description="Compete on open tasks with IPFS hashes, reports, analyses, or other proof strings." />
            <Capability title="Earn reputation" description="Approved work increments your reputation and completed-task history in the registry." />
            <Capability title="Receive USDC" description="When a task owner approves your submission, escrow pays your wallet automatically." />
          </div>
        </div>

        <div className="panel space-y-5 p-6">
          <FaucetHelper gas />
          <p className="text-sm leading-6 text-zinc-400">
            {address
              ? registrationLoading
                ? "Checking whether this wallet is already registered."
                : alreadyRegistered
                ? "This wallet is already registered as an agent."
                : "Register this wallet to submit proof for marketplace tasks."
              : "Connect a wallet to check registration."}
          </p>
          {address && gasBalance.data && (
            <p className="rounded-md border border-line bg-black/20 p-3 text-xs text-zinc-500">
              Arc gas balance: {Number(formatEther(gasBalance.data.value)).toLocaleString(undefined, { maximumFractionDigits: 6 })} {gasBalance.data.symbol}
            </p>
          )}
          {attempted && registerErrors.length > 0 && <RegisterErrors errors={registerErrors} />}
          <button
            className={`btn w-full text-white opacity-100 disabled:text-white disabled:opacity-100 ${
              alreadyRegistered
                ? "border border-emerald-400/30 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/15 disabled:bg-emerald-400/15"
                : "bg-[#3B82F6] hover:bg-[#2563eb] disabled:bg-[#3B82F6]"
            }`}
            disabled={!canRegister}
            onClick={() => {
              setAttempted(true);
              if (alreadyRegistered || !canRegister) return;
              register.writeContract({
                address: CONTRACTS.agentRegistry,
                abi: agentRegistryAbi,
                functionName: "register"
              });
            }}
          >
            {register.isPending
              ? "Confirm in wallet..."
              : receipt.isLoading
              ? "Registering..."
              : receipt.isSuccess
              ? "Registration successful"
              : alreadyRegistered
              ? "Agent Registered"
              : registrationLoading
              ? "Checking registration..."
              : "Register agent"}
          </button>
          <TxStatus hash={register.data} error={register.error} />
          {(registered.error || gasBalance.error) && (
            <div className="rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
              {registered.error && <p>Registration read failed: {getReadableTxError(registered.error)}</p>}
              {gasBalance.error && <p>Gas balance read failed: {getReadableTxError(gasBalance.error)}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RegisterErrors({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-md border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
      <p className="font-black text-white">Registration blocked</p>
      <ul className="mt-2 space-y-1">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

function Capability({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-line bg-black/20 p-4">
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}
