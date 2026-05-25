# Contributing

ArcProofPool is a small protocol demo with deployed Arc Testnet contracts. Contributions should preserve the deployed-contract integration unless a change explicitly targets a new deployment.

## Ground Rules

- Do not commit private keys, seed phrases, `.env`, or `.env.local`.
- Do not change deployed contract addresses in `contracts.config.ts` unless the deployment has intentionally changed.
- Do not change contract logic without adding or updating Foundry tests.
- Keep frontend reads and writes contract-backed. Do not add mock marketplace data.

## Local Checks

Run the full frontend check before opening a pull request:

```bash
npm run check
```

Run contract tests when Solidity changes:

```bash
forge test
```

## Pull Request Standard

A strong PR should include:

- a short description of the user-facing change;
- screenshots for UI changes;
- contract/test notes for Solidity changes;
- confirmation that no secrets or env files are included.
