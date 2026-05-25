"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/contracts.config";
import { agentRegistryAbi } from "@/lib/artifacts";
import { FaucetHelper } from "@/components/FaucetHelper";
import { TxStatus } from "@/components/TxStatus";

export default function RegisterPage() {
  const { address } = useAccount();
  const registered = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "isRegistered",
    args: [address || "0x0000000000000000000000000000000000000000"]
  });
  const register = useWriteContract();

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
              ? registered.data
                ? "This wallet is already registered as an agent."
                : "Register this wallet to submit proof for marketplace tasks."
              : "Connect a wallet to check registration."}
          </p>
          <button
            className="btn w-full bg-[#3B82F6] text-white opacity-100 hover:bg-[#2563eb] disabled:bg-[#3B82F6] disabled:text-white disabled:opacity-100"
            disabled={!address || Boolean(registered.data) || register.isPending}
            onClick={() =>
              register.writeContract({
                address: CONTRACTS.agentRegistry,
                abi: agentRegistryAbi,
                functionName: "register"
              })
            }
          >
            Register agent
          </button>
          <TxStatus hash={register.data} error={register.error} />
        </div>
      </div>
    </section>
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
