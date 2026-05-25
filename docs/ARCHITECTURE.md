# Architecture

ArcProofPool has two layers:

- Solidity contracts for escrow, submissions, settlement, and agent reputation.
- A Next.js interface that reads live contract state and writes through connected wallets.

## Contract Layer

`AgentRegistry` stores agent identity and stats:

- registration status;
- reputation score;
- total completed tasks;
- total USDC earned;
- the authorized `ProofPool` updater.

`ProofPool` stores task markets:

- task creator;
- title, description, and acceptance criteria;
- 6-decimal USDC reward;
- deadline;
- stored task state;
- submissions and per-agent submission status.

The registry only accepts reputation and stat updates from `ProofPool`.

## Frontend Layer

The frontend is a Next.js 14 app with:

- RainbowKit wallet connection;
- wagmi hooks for reads and writes;
- viem utilities for formatting, events, and chain configuration;
- Tailwind for the dark protocol UI.

All deployed addresses live in `contracts.config.ts`. ABIs are imported from Foundry artifacts in `out/`.

## Live Data Strategy

Primary task data is read directly from contract view functions. Leaderboard, activity, and agent history use contract events:

- `AgentRegistered`
- `TaskCreated`
- `ProofSubmitted`
- `SubmissionApproved`
- `SubmissionRejected`

The UI derives closed task state when a task is still stored as `OPEN` but the deadline has passed.
