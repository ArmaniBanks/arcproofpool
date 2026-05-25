// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SimpleERC20} from "./SimpleERC20.sol";

contract MockUSDC is SimpleERC20 {
    constructor() SimpleERC20("Mock USD Coin", "USDC", 6) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
