# Deployment

ArcProofPool is currently deployed on Arc Testnet.

## Network

- Chain: Arc Testnet
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- USDC: `0x3600000000000000000000000000000000000000`
- USDC decimals: `6`

## Current Contracts

| Contract | Address |
| --- | --- |
| AgentRegistry | `0x11c1727ae58e55daf4bf1f4eaa804527b0f491fb` |
| ProofPool | `0xc5d24d0c2392a38d4770a7c7dacfe15a9af99769` |
| USDC | `0x3600000000000000000000000000000000000000` |

## Foundry Deployment

Use a funded Arc Testnet deployer wallet. Keep the private key in `.env.local`; never commit it.

```bash
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.network --broadcast --private-key $PRIVATE_KEY
```

The deploy script:

1. Deploys `AgentRegistry`.
2. Deploys `ProofPool` with the registry and Arc Testnet USDC address.
3. Calls `AgentRegistry.setProofPool(proofPool)`.
4. Logs deployed addresses.

After deployment, update `contracts.config.ts`, rebuild the app, and restart the frontend.

## TypeScript Deployment Helper

This repo also includes a local helper:

```bash
npm run deploy:arc
```

It reads `PRIVATE_KEY` from `.env.local`, deploys the same contract sequence, wires the registry, and updates `contracts.config.ts`.
