"use client";

import { useWaitForTransactionReceipt } from "wagmi";
import type { Hash } from "viem";
import { ARC_TESTNET } from "@/contracts.config";

export function TxStatus({ hash, error }: { hash?: Hash; error?: Error | null }) {
  const receipt = useWaitForTransactionReceipt({ hash });

  if (error) return <StatusLine tone="error" label={`Failed: ${error.message}`} />;
  if (receipt.isLoading) return <StatusLine hash={hash} label="Pending confirmation" />;
  if (receipt.isSuccess) return <StatusLine hash={hash} label="Confirmed on Arc" />;
  if (hash) return <StatusLine hash={hash} label="Transaction submitted" />;
  return null;
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
