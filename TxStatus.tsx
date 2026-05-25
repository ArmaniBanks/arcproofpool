"use client";

import { useWaitForTransactionReceipt } from "wagmi";
import type { Hash } from "viem";
import { ARC_TESTNET } from "@/contracts.config";

export function TxStatus({ hash, error }: { hash?: Hash; error?: Error | null }) {
  const receipt = useWaitForTransactionReceipt({ hash });

  if (hash) {
    if (receipt.isSuccess) return <StatusLine hash={hash} label="Confirmed on Arc" />;
    if (receipt.isError) return <StatusLine hash={hash} tone="error" label={`Transaction failed: ${getReadableTxError(receipt.error)}`} />;
    return <StatusLine hash={hash} label={receipt.isLoading ? "Pending confirmation" : "Transaction submitted"} />;
  }
  if (error) return <StatusLine tone="error" label={`Failed: ${getReadableTxError(error)}`} />;
  return null;
}

export function getReadableTxError(error?: Error | null) {
  if (!error) return "";
  const message = error.message || "Unknown transaction error";
  const lower = message.toLowerCase();

  if (lower.includes("alreadyregistered") || lower.includes("already registered")) {
    return "This wallet is already registered.";
  }
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected the request")) {
    return "Transaction rejected.";
  }
  if (lower.includes("insufficient funds") || lower.includes("insufficient gas")) {
    return "Insufficient gas.";
  }
  if (lower.includes("wrong network") || lower.includes("chain mismatch") || lower.includes("unsupported chain")) {
    return "Wrong network.";
  }
  if (lower.includes("abi") && (lower.includes("decode") || lower.includes("signature"))) {
    return "Contract rejected the transaction. Refresh the page and check wallet status before trying again.";
  }
  if (lower.includes("execution reverted") || lower.includes("revert")) {
    return message.replace(/\\n\\s*/g, " ");
  }
  if (lower.includes("rpc") || lower.includes("fetch") || lower.includes("request")) {
    return `RPC error: ${message}`;
  }

  return message;
}

function StatusLine({ hash, label, tone = "success" }: { hash?: Hash; label: string; tone?: "success" | "error" }) {
  const toneClass = tone === "error" ? "border-red-400/30 bg-red-400/10 text-red-200" : "border-arc/30 bg-arc/10 text-blue-100";

  return (
    <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${toneClass}`}>
      {label}
      {hash && (
        <>
          {" "}
          <a
            className="font-black underline-offset-4 hover:underline"
            href={`${ARC_TESTNET.explorerUrl}/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View tx
          </a>
        </>
      )}
    </p>
  );
}
