// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract Script {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}

library console2 {
    event Log(string message, address value);

    function log(string memory message, address value) internal {
        emit Log(message, value);
    }
}
