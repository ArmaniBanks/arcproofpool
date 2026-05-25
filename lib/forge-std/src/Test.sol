// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes calldata) external;
    function warp(uint256) external;
}

contract Test {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertTrue(bool condition) internal pure {
        require(condition, "assertTrue failed");
    }

    function assertFalse(bool condition) internal pure {
        require(!condition, "assertFalse failed");
    }

    function assertEq(uint256 actual, uint256 expected) internal pure {
        require(actual == expected, "assertEq uint failed");
    }

    function assertEq(int256 actual, int256 expected) internal pure {
        require(actual == expected, "assertEq int failed");
    }

    function assertEq(address actual, address expected) internal pure {
        require(actual == expected, "assertEq address failed");
    }

    function assertEq(bool actual, bool expected) internal pure {
        require(actual == expected, "assertEq bool failed");
    }
}
