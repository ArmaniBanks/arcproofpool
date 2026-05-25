"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain } from "viem";
import { WagmiProvider } from "wagmi";
import { ARC_TESTNET } from "@/contracts.config";
import { useState } from "react";

const arcTestnet = defineChain({
  id: ARC_TESTNET.id,
  name: ARC_TESTNET.name,
  nativeCurrency: { name: "Arc", symbol: "ARC", decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_TESTNET.rpcUrl] }
  },
  blockExplorers: {
    default: { name: "ArcScan", url: ARC_TESTNET.explorerUrl }
  },
  testnet: true
});

const config = getDefaultConfig({
  appName: "ArcProofPool",
  projectId: "arcproofpool-demo",
  wallets: [
    {
      groupName: "Browser wallets",
      wallets: [injectedWallet]
    }
  ],
  chains: [arcTestnet],
  ssr: true
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
