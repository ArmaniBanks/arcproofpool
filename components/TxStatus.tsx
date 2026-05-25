"use client";

import { useWaitForTransactionReceipt } from "wagmi";
import type { Hash } from "viem";

export function TxStatus({ hash, error }: { hash?: Hash; error?: Error | null }) {
  const receipt = useWaitForTransactionReceipt({ hash });

  if (error) return <p className="text-sm font-semibold text-signal">Failed: {error.message}</p>;
  if (receipt.isLoading) return <p className="text-sm font-semibold text-arc">Pending...</p>;
  if (receipt.isSuccess) return <p className="text-sm font-semibold text-arc">Confirmed</p>;
  if (hash) return <p className="text-sm font-semibold text-arc">Submitted</p>;
  return null;
}
