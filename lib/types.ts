import type { Address } from "viem";

export type Task = {
  creator: Address;
  title: string;
  description: string;
  acceptanceCriteria: string;
  reward: bigint;
  deadline: bigint;
  state: number;
  winner: Address;
  submissionCount: bigint;
};

export type Submission = {
  agent: Address;
  proof: string;
  timestamp: bigint;
  status: number;
};

export type Agent = {
  registered: boolean;
  reputation: bigint;
  totalTasksCompleted: bigint;
  totalEarned: bigint;
};
