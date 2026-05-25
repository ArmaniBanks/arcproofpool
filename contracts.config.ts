import type { Address } from "viem";

export const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app"
} as const;

export const CONTRACTS = {
  agentRegistry: "0x11c1727ae58e55daf4bf1f4eaa804527b0f491fb" as Address,
  proofPool: "0xc5d24d0c2392a38d4770a7c7dacfe15a9af99769" as Address,
  usdc: "0x3600000000000000000000000000000000000000" as Address
} as const;
