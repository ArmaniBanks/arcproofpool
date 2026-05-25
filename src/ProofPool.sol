// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "./AgentRegistry.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract ProofPool {
    enum TaskState {
        OPEN,
        CLOSED,
        APPROVED,
        CANCELLED
    }

    enum SubmissionStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CLOSED
    }

    struct Task {
        address creator;
        string title;
        string description;
        string acceptanceCriteria;
        uint256 reward;
        uint256 deadline;
        TaskState state;
        address winner;
        uint256 submissionCount;
    }

    struct Submission {
        address agent;
        string proof;
        uint256 timestamp;
        SubmissionStatus status;
    }

    IERC20 public immutable usdc;
    AgentRegistry public immutable registry;
    uint256 public taskCount;

    mapping(uint256 => Task) private _tasks;
    mapping(uint256 => Submission[]) private _submissions;
    mapping(uint256 => mapping(address => uint256)) private _submissionIndex;

    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        string title,
        uint256 reward,
        uint256 deadline
    );
    event ProofSubmitted(uint256 indexed taskId, address indexed agent, string proof);
    event TaskClosed(uint256 indexed taskId);
    event SubmissionApproved(uint256 indexed taskId, address indexed agent, uint256 reward);
    event SubmissionRejected(uint256 indexed taskId, address indexed agent);
    event TaskCancelled(uint256 indexed taskId);

    error InvalidReward();
    error InvalidDeadline();
    error InvalidTask();
    error NotTaskOwner();
    error NotRegisteredAgent();
    error TaskNotOpen();
    error DeadlineNotPassed();
    error SubmissionExists();
    error NoSubmission();
    error AlreadyRejected();
    error AlreadyFinalized();
    error TransferFailed();

    constructor(address registry_, address usdc_) {
        registry = AgentRegistry(registry_);
        usdc = IERC20(usdc_);
    }

    function createTask(
        string calldata title,
        string calldata description,
        string calldata acceptanceCriteria,
        uint256 reward,
        uint256 deadline
    ) external returns (uint256 taskId) {
        if (reward == 0) revert InvalidReward();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        taskId = taskCount++;
        _tasks[taskId] = Task({
            creator: msg.sender,
            title: title,
            description: description,
            acceptanceCriteria: acceptanceCriteria,
            reward: reward,
            deadline: deadline,
            state: TaskState.OPEN,
            winner: address(0),
            submissionCount: 0
        });

        if (!usdc.transferFrom(msg.sender, address(this), reward)) revert TransferFailed();
        emit TaskCreated(taskId, msg.sender, title, reward, deadline);
    }

    function submitProof(uint256 taskId, string calldata proof) external {
        Task storage task = _task(taskId);
        if (task.state != TaskState.OPEN || block.timestamp > task.deadline) revert TaskNotOpen();
        if (!registry.isRegistered(msg.sender)) revert NotRegisteredAgent();
        if (_hasSubmission(taskId, msg.sender)) revert SubmissionExists();

        _submissionIndex[taskId][msg.sender] = _submissions[taskId].length + 1;
        _submissions[taskId].push(
            Submission({
                agent: msg.sender,
                proof: proof,
                timestamp: block.timestamp,
                status: SubmissionStatus.PENDING
            })
        );
        task.submissionCount += 1;

        emit ProofSubmitted(taskId, msg.sender, proof);
    }

    function closeTask(uint256 taskId) external {
        Task storage task = _task(taskId);
        if (task.state != TaskState.OPEN) revert TaskNotOpen();
        if (block.timestamp <= task.deadline) revert DeadlineNotPassed();

        task.state = TaskState.CLOSED;
        emit TaskClosed(taskId);
    }

    function approve(uint256 taskId, address agent) external {
        Task storage task = _task(taskId);
        if (msg.sender != task.creator) revert NotTaskOwner();
        if (task.state == TaskState.APPROVED || task.state == TaskState.CANCELLED) {
            revert AlreadyFinalized();
        }

        Submission storage winningSubmission = _submission(taskId, agent);
        if (winningSubmission.status == SubmissionStatus.REJECTED) revert AlreadyRejected();
        if (winningSubmission.status != SubmissionStatus.PENDING) revert AlreadyFinalized();

        winningSubmission.status = SubmissionStatus.APPROVED;
        task.state = TaskState.APPROVED;
        task.winner = agent;

        Submission[] storage submissions = _submissions[taskId];
        for (uint256 i = 0; i < submissions.length; i++) {
            if (submissions[i].agent != agent && submissions[i].status == SubmissionStatus.PENDING) {
                submissions[i].status = SubmissionStatus.CLOSED;
            }
        }

        registry.rewardAgent(agent, task.reward);
        if (!usdc.transfer(agent, task.reward)) revert TransferFailed();

        emit SubmissionApproved(taskId, agent, task.reward);
    }

    function reject(uint256 taskId, address agent) external {
        Task storage task = _task(taskId);
        if (msg.sender != task.creator) revert NotTaskOwner();
        if (task.state == TaskState.APPROVED || task.state == TaskState.CANCELLED) {
            revert AlreadyFinalized();
        }

        Submission storage submission = _submission(taskId, agent);
        if (submission.status == SubmissionStatus.REJECTED) revert AlreadyRejected();
        if (submission.status != SubmissionStatus.PENDING) revert AlreadyFinalized();

        submission.status = SubmissionStatus.REJECTED;
        registry.penalizeAgent(agent);

        emit SubmissionRejected(taskId, agent);
    }

    function cancel(uint256 taskId) external {
        Task storage task = _task(taskId);
        if (msg.sender != task.creator) revert NotTaskOwner();
        if (task.state == TaskState.APPROVED || task.state == TaskState.CANCELLED) {
            revert AlreadyFinalized();
        }

        task.state = TaskState.CANCELLED;
        if (!usdc.transfer(task.creator, task.reward)) revert TransferFailed();

        emit TaskCancelled(taskId);
    }

    function getTask(uint256 taskId) external view returns (Task memory) {
        return _taskView(taskId);
    }

    function getDerivedState(uint256 taskId) external view returns (TaskState) {
        Task memory task = _taskView(taskId);
        if (task.state == TaskState.OPEN && block.timestamp > task.deadline) {
            return TaskState.CLOSED;
        }
        return task.state;
    }

    function getSubmissions(uint256 taskId) external view returns (Submission[] memory) {
        _taskView(taskId);
        return _submissions[taskId];
    }

    function getSubmission(uint256 taskId, address agent) external view returns (Submission memory) {
        return _submissionView(taskId, agent);
    }

    function hasSubmission(uint256 taskId, address agent) external view returns (bool) {
        _taskView(taskId);
        return _hasSubmission(taskId, agent);
    }

    function _task(uint256 taskId) private view returns (Task storage task) {
        if (taskId >= taskCount) revert InvalidTask();
        task = _tasks[taskId];
    }

    function _taskView(uint256 taskId) private view returns (Task memory task) {
        if (taskId >= taskCount) revert InvalidTask();
        task = _tasks[taskId];
    }

    function _submission(uint256 taskId, address agent) private view returns (Submission storage) {
        uint256 index = _submissionIndex[taskId][agent];
        if (index == 0) revert NoSubmission();
        return _submissions[taskId][index - 1];
    }

    function _submissionView(uint256 taskId, address agent) private view returns (Submission memory) {
        _taskView(taskId);
        uint256 index = _submissionIndex[taskId][agent];
        if (index == 0) revert NoSubmission();
        return _submissions[taskId][index - 1];
    }

    function _hasSubmission(uint256 taskId, address agent) private view returns (bool) {
        return _submissionIndex[taskId][agent] != 0;
    }
}
