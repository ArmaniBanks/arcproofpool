// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {ProofPool} from "../src/ProofPool.sol";

contract Deploy is Script {
    address internal constant ARC_TESTNET_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        vm.startBroadcast();

        AgentRegistry registry = new AgentRegistry();
        ProofPool proofPool = new ProofPool(address(registry), ARC_TESTNET_USDC);
        registry.setProofPool(address(proofPool));

        vm.stopBroadcast();

        console2.log("AgentRegistry:", address(registry));
        console2.log("ProofPool:", address(proofPool));
        console2.log("USDC:", ARC_TESTNET_USDC);
    }
}
