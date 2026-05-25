import { ARC_TESTNET, CONTRACTS } from "@/contracts.config";
import { formatUsdc, shortAddress, submissionLabels } from "@/lib/format";
import type { Address, GetLogsReturnType, PublicClient } from "viem";
import { parseAbiItem } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export const events = {
  agentRegistered: parseAbiItem("event AgentRegistered(address indexed agent)"),
  taskCreated: parseAbiItem(
    "event TaskCreated(uint256 indexed taskId, address indexed creator, string title, uint256 reward, uint256 deadline)"
  ),
  proofSubmitted: parseAbiItem("event ProofSubmitted(uint256 indexed taskId, address indexed agent, string proof)"),
  submissionApproved: parseAbiItem(
    "event SubmissionApproved(uint256 indexed taskId, address indexed agent, uint256 reward)"
  ),
  submissionRejected: parseAbiItem("event SubmissionRejected(uint256 indexed taskId, address indexed agent)")
} as const;

export type ProtocolActivityItem = {
  id: string;
  type: "TaskCreated" | "ProofSubmitted" | "SubmissionApproved" | "SubmissionRejected" | "RewardPaid";
  wallet: Address;
  taskId: bigint;
  timestamp: bigint;
  reward?: bigint;
  transactionHash: `0x${string}`;
};

export type AgentSubmissionHistoryItem = {
  id: string;
  taskId: bigint;
  timestamp: bigint;
  transactionHash: `0x${string}`;
  outcome: string;
  reward?: bigint;
};

export function explorerTxUrl(hash: `0x${string}`) {
  return `${ARC_TESTNET.explorerUrl}/tx/${hash}`;
}

export function isConfigured(address: Address) {
  return address.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
}

export async function getBlockTimestamps(publicClient: PublicClient, blockNumbers: bigint[]) {
  const uniqueBlocks = Array.from(new Set(blockNumbers.map((block) => block.toString())));
  const entries = await Promise.all(
    uniqueBlocks.map(async (block) => {
      const data = await publicClient.getBlock({ blockNumber: BigInt(block) });
      return [block, data.timestamp] as const;
    })
  );
  return new Map(entries);
}

export async function getRegisteredAgentAddresses(publicClient: PublicClient) {
  if (!isConfigured(CONTRACTS.agentRegistry)) return [];
  const logs = await publicClient.getLogs({
    address: CONTRACTS.agentRegistry,
    event: events.agentRegistered,
    fromBlock: 0n,
    toBlock: "latest"
  });

  const addresses = logs
    .map((log) => log.args.agent)
    .filter((agent): agent is Address => Boolean(agent));
  return Array.from(new Map(addresses.map((agent) => [agent.toLowerCase(), agent])).values());
}

export async function getProtocolActivity(publicClient: PublicClient) {
  if (!isConfigured(CONTRACTS.proofPool)) return [];

  const [created, submitted, approved, rejected] = await Promise.all([
    publicClient.getLogs({
      address: CONTRACTS.proofPool,
      event: events.taskCreated,
      fromBlock: 0n,
      toBlock: "latest"
    }),
    publicClient.getLogs({
      address: CONTRACTS.proofPool,
      event: events.proofSubmitted,
      fromBlock: 0n,
      toBlock: "latest"
    }),
    publicClient.getLogs({
      address: CONTRACTS.proofPool,
      event: events.submissionApproved,
      fromBlock: 0n,
      toBlock: "latest"
    }),
    publicClient.getLogs({
      address: CONTRACTS.proofPool,
      event: events.submissionRejected,
      fromBlock: 0n,
      toBlock: "latest"
    })
  ]);

  const allLogs = [...created, ...submitted, ...approved, ...rejected];
  const timestamps = await getBlockTimestamps(
    publicClient,
    allLogs.map((log) => log.blockNumber)
  );

  const items: ProtocolActivityItem[] = [
    ...created.map((log) => ({
      id: `${log.transactionHash}-${log.logIndex}-created`,
      type: "TaskCreated" as const,
      wallet: log.args.creator as Address,
      taskId: log.args.taskId || 0n,
      timestamp: timestamps.get(log.blockNumber.toString()) || 0n,
      reward: log.args.reward,
      transactionHash: log.transactionHash
    })),
    ...submitted.map((log) => ({
      id: `${log.transactionHash}-${log.logIndex}-submitted`,
      type: "ProofSubmitted" as const,
      wallet: log.args.agent as Address,
      taskId: log.args.taskId || 0n,
      timestamp: timestamps.get(log.blockNumber.toString()) || 0n,
      transactionHash: log.transactionHash
    })),
    ...approved.flatMap((log) => [
      {
        id: `${log.transactionHash}-${log.logIndex}-approved`,
        type: "SubmissionApproved" as const,
        wallet: log.args.agent as Address,
        taskId: log.args.taskId || 0n,
        timestamp: timestamps.get(log.blockNumber.toString()) || 0n,
        reward: log.args.reward,
        transactionHash: log.transactionHash
      },
      {
        id: `${log.transactionHash}-${log.logIndex}-reward`,
        type: "RewardPaid" as const,
        wallet: log.args.agent as Address,
        taskId: log.args.taskId || 0n,
        timestamp: timestamps.get(log.blockNumber.toString()) || 0n,
        reward: log.args.reward,
        transactionHash: log.transactionHash
      }
    ]),
    ...rejected.map((log) => ({
      id: `${log.transactionHash}-${log.logIndex}-rejected`,
      type: "SubmissionRejected" as const,
      wallet: log.args.agent as Address,
      taskId: log.args.taskId || 0n,
      timestamp: timestamps.get(log.blockNumber.toString()) || 0n,
      transactionHash: log.transactionHash
    }))
  ];

  return items.sort((a, b) => Number(b.timestamp - a.timestamp)).slice(0, 100);
}

export async function getAgentSubmissionHistory(publicClient: PublicClient, agent: Address) {
  if (!isConfigured(CONTRACTS.proofPool)) return [];

  const [submitted, approved, rejected] = await Promise.all([
    publicClient.getLogs({
      address: CONTRACTS.proofPool,
      event: events.proofSubmitted,
      args: { agent },
      fromBlock: 0n,
      toBlock: "latest"
    }),
    publicClient.getLogs({
      address: CONTRACTS.proofPool,
      event: events.submissionApproved,
      args: { agent },
      fromBlock: 0n,
      toBlock: "latest"
    }),
    publicClient.getLogs({
      address: CONTRACTS.proofPool,
      event: events.submissionRejected,
      args: { agent },
      fromBlock: 0n,
      toBlock: "latest"
    })
  ]);

  const allLogs = [...submitted, ...approved, ...rejected];
  const timestamps = await getBlockTimestamps(
    publicClient,
    allLogs.map((log) => log.blockNumber)
  );

  const approvalsByTask = new Map(approved.map((log) => [(log.args.taskId || 0n).toString(), log]));
  const rejectionsByTask = new Map(rejected.map((log) => [(log.args.taskId || 0n).toString(), log]));

  return submitted
    .map((log) => {
      const taskKey = (log.args.taskId || 0n).toString();
      const approval = approvalsByTask.get(taskKey);
      const rejection = rejectionsByTask.get(taskKey);
      return {
        id: `${log.transactionHash}-${log.logIndex}`,
        taskId: log.args.taskId || 0n,
        timestamp: timestamps.get(log.blockNumber.toString()) || 0n,
        transactionHash: log.transactionHash,
        outcome: approval ? submissionLabels[1] : rejection ? submissionLabels[2] : submissionLabels[0],
        reward: approval?.args.reward
      };
    })
    .sort((a, b) => Number(b.timestamp - a.timestamp));
}

export function activityLabel(item: ProtocolActivityItem) {
  if (item.type === "RewardPaid" && item.reward !== undefined) {
    return `Reward paid: ${formatUsdc(item.reward)} USDC`;
  }
  return item.type;
}

export function actorLabel(address: Address) {
  return shortAddress(address);
}
