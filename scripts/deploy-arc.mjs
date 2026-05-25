import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  http
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = process.cwd();
const rpcUrl = "https://rpc.testnet.arc.network";
const explorerUrl = "https://testnet.arcscan.app";
const usdc = "0x3600000000000000000000000000000000000000";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

function getPrivateKey() {
  const localEnv = readEnvFile(path.join(root, ".env.local"));
  const key = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || localEnv.PRIVATE_KEY;

  if (!key) {
    throw new Error(
      "Missing deployer key. Add PRIVATE_KEY=0x... to .env.local, then run npm run deploy:arc."
    );
  }

  return key.startsWith("0x") ? key : `0x${key}`;
}

function compileContracts() {
  const sources = {
    "src/AgentRegistry.sol": {
      content: fs.readFileSync(path.join(root, "src", "AgentRegistry.sol"), "utf8")
    },
    "src/ProofPool.sol": {
      content: fs.readFileSync(path.join(root, "src", "ProofPool.sol"), "utf8")
    }
  };

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((item) => item.severity === "error") ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
  }

  return {
    agentRegistry: output.contracts["src/AgentRegistry.sol"].AgentRegistry,
    proofPool: output.contracts["src/ProofPool.sol"].ProofPool
  };
}

function writeConfig(agentRegistryAddress, proofPoolAddress) {
  const configPath = path.join(root, "contracts.config.ts");
  let config = fs.readFileSync(configPath, "utf8");

  config = config
    .replace(/agentRegistry:\s*"0x[a-fA-F0-9]{40}" as Address/, `agentRegistry: "${agentRegistryAddress}" as Address`)
    .replace(/proofPool:\s*"0x[a-fA-F0-9]{40}" as Address/, `proofPool: "${proofPoolAddress}" as Address`)
    .replace(/usdc:\s*"0x[a-fA-F0-9]{40}" as Address/, `usdc: "${usdc}" as Address`);

  fs.writeFileSync(configPath, config);
}

async function main() {
  const privateKey = getPrivateKey();
  const account = privateKeyToAccount(privateKey);
  const contracts = compileContracts();
  const arcTestnet = defineChain({
    id: 5042002,
    name: "Arc Testnet",
    nativeCurrency: { name: "Arc", symbol: "ARC", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: { default: { name: "ArcScan", url: explorerUrl } }
  });

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl)
  });
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(rpcUrl)
  });

  const chainId = await publicClient.getChainId();
  if (chainId !== 5042002) {
    throw new Error(`Connected to unexpected chain ID ${chainId}. Expected 5042002.`);
  }

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Native balance: ${formatEther(balance)} ARC`);

  console.log("Deploying AgentRegistry...");
  const registryHash = await walletClient.deployContract({
    abi: contracts.agentRegistry.abi,
    bytecode: `0x${contracts.agentRegistry.evm.bytecode.object}`
  });
  console.log(`AgentRegistry tx: ${explorerUrl}/tx/${registryHash}`);
  const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryHash });
  const agentRegistry = registryReceipt.contractAddress;
  if (!agentRegistry) throw new Error("AgentRegistry deployment did not return an address.");
  console.log(`AgentRegistry: ${agentRegistry}`);

  console.log("Deploying ProofPool...");
  const proofPoolHash = await walletClient.deployContract({
    abi: contracts.proofPool.abi,
    bytecode: `0x${contracts.proofPool.evm.bytecode.object}`,
    args: [agentRegistry, usdc]
  });
  console.log(`ProofPool tx: ${explorerUrl}/tx/${proofPoolHash}`);
  const proofPoolReceipt = await publicClient.waitForTransactionReceipt({ hash: proofPoolHash });
  const proofPool = proofPoolReceipt.contractAddress;
  if (!proofPool) throw new Error("ProofPool deployment did not return an address.");
  console.log(`ProofPool: ${proofPool}`);

  console.log("Wiring AgentRegistry.setProofPool...");
  const wireHash = await walletClient.writeContract({
    address: agentRegistry,
    abi: contracts.agentRegistry.abi,
    functionName: "setProofPool",
    args: [proofPool]
  });
  console.log(`setProofPool tx: ${explorerUrl}/tx/${wireHash}`);
  await publicClient.waitForTransactionReceipt({ hash: wireHash });

  writeConfig(agentRegistry, proofPool);
  console.log("Updated contracts.config.ts");
  console.log("");
  console.log("Deployment complete");
  console.log(`AgentRegistry: ${agentRegistry}`);
  console.log(`ProofPool: ${proofPool}`);
  console.log(`USDC: ${usdc}`);
  console.log(`AgentRegistry ArcScan: ${explorerUrl}/address/${agentRegistry}`);
  console.log(`ProofPool ArcScan: ${explorerUrl}/address/${proofPool}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
