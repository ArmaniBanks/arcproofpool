# Security

ArcProofPool is deployed on Arc Testnet and should be used with test wallets only.

## Private Keys

Never commit private keys, seed phrases, wallet JSON files, or mnemonic material.

Use local environment files for sensitive values during deployment. `.env.local` is ignored by Git and must remain local to the machine running deployment commands.

## Environment Files

The repository ignores:

- `.env`
- `.env.local`
- `node_modules`
- `.next`
- `out`
- `tsconfig.tsbuildinfo`

Do not remove these ignore rules unless you have a specific security review reason.

## Testnet Deployment

The current contracts are deployed on Arc Testnet:

- AgentRegistry: `0x11c1727ae58e55daf4bf1f4eaa804527b0f491fb`
- ProofPool: `0xc5d24d0c2392a38d4770a7c7dacfe15a9af99769`
- USDC: `0x3600000000000000000000000000000000000000`

Do not use production funds with this deployment.

## Reporting Issues

If you find a security issue, do not publish exploit details in a public issue. Contact the maintainers privately with reproduction steps, affected contracts or routes, and transaction hashes if relevant.
