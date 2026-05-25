// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct Agent {
        bool registered;
        int256 reputation;
        uint256 totalTasksCompleted;
        uint256 totalEarned;
    }

    mapping(address => Agent) private _agents;
    address public owner;
    address public proofPool;

    event AgentRegistered(address indexed agent);
    event ProofPoolSet(address indexed proofPool);
    event AgentRewarded(address indexed agent, uint256 amount, int256 reputation);
    event AgentPenalized(address indexed agent, int256 reputation);

    error AlreadyRegistered();
    error NotOwner();
    error NotProofPool();
    error ZeroAddress();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProofPool() {
        if (msg.sender != proofPool) revert NotProofPool();
        _;
    }

    function register() external {
        if (_agents[msg.sender].registered) revert AlreadyRegistered();

        _agents[msg.sender].registered = true;
        emit AgentRegistered(msg.sender);
    }

    function setProofPool(address proofPool_) external onlyOwner {
        if (proofPool_ == address(0)) revert ZeroAddress();
        proofPool = proofPool_;
        emit ProofPoolSet(proofPool_);
    }

    function isRegistered(address agent) external view returns (bool) {
        return _agents[agent].registered;
    }

    function getAgent(address agent) external view returns (Agent memory) {
        return _agents[agent];
    }

    function rewardAgent(address agent, uint256 amount) external onlyProofPool {
        Agent storage account = _agents[agent];
        if (!account.registered) revert ZeroAddress();

        account.reputation += 1;
        account.totalTasksCompleted += 1;
        account.totalEarned += amount;

        emit AgentRewarded(agent, amount, account.reputation);
    }

    function penalizeAgent(address agent) external onlyProofPool {
        Agent storage account = _agents[agent];
        if (!account.registered) revert ZeroAddress();

        account.reputation -= 1;
        emit AgentPenalized(agent, account.reputation);
    }
}
