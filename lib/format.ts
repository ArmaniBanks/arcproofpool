import type { Address } from "viem";
import { formatUnits, parseUnits } from "viem";

export const stateLabels = ["OPEN", "CLOSED", "APPROVED", "CANCELLED"] as const;
export const submissionLabels = ["PENDING", "APPROVED", "REJECTED", "CLOSED"] as const;

export function formatUsdc(value?: bigint) {
  if (value === undefined) return "0";
  return Number(formatUnits(value, 6)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  });
}

export function parseUsdc(value: string) {
  return parseUnits(value || "0", 6);
}

export function shortAddress(address?: Address | string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(seconds?: bigint) {
  if (!seconds) return "";
  return new Date(Number(seconds) * 1000).toLocaleString();
}

export function derivedState(storedState: number, deadline: bigint, nowSeconds: number) {
  if (storedState === 0 && BigInt(nowSeconds) > deadline) return 1;
  return storedState;
}
