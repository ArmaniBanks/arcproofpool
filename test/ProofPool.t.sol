// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ProofPool} from "../src/ProofPool.sol";

contract ProofPoolTest is Test {
    MockUSDC internal usdc;
    AgentRegistry internal registry;
    ProofPool internal pool;

    address internal creator = address(0xA11CE);
    address internal agentA = address(0xA);
    address internal agentB = address(0xB);
    address internal stranger = address(0xBAD);

    uint256 internal constant REWARD = 50_000_000;
    uint256 internal deadline;

    function setUp() public {
        usdc = new MockUSDC();
        registry = new AgentRegistry();
        pool = new ProofPool(address(registry), address(usdc));
        registry.setProofPool(address(pool));

        deadline = block.timestamp + 7 days;
        usdc.mint(creator, 1_000_000_000);

        vm.prank(agentA);
        registry.register();

        vm.prank(agentB);
        registry.register();
    }

    function testAgentRegistration() public {
        address newAgent = address(0x123);

        vm.prank(newAgent);
        registry.register();

        assertTrue(registry.isRegistered(newAgent));
        AgentRegistry.Agent memory agent = registry.getAgent(newAgent);
        assertEq(agent.reputation, int256(0));
        assertEq(agent.totalTasksCompleted, 0);
        assertEq(agent.totalEarned, 0);
    }

    function testTaskCreationWithUsdcEscrowLock() public {
        uint256 taskId = _createTask();

        ProofPool.Task memory task = pool.getTask(taskId);
        assertEq(task.creator, creator);
        assertEq(task.reward, REWARD);
        assertEq(uint256(task.state), uint256(ProofPool.TaskState.OPEN));
        assertEq(usdc.balanceOf(address(pool)), REWARD);
        assertEq(usdc.balanceOf(creator), 950_000_000);
    }

    function testMultipleAgentsSubmitProofForSameTask() public {
        uint256 taskId = _createTask();

        _submit(taskId, agentA, "ipfs://agent-a");
        _submit(taskId, agentB, "ipfs://agent-b");

        ProofPool.Submission[] memory submissions = pool.getSubmissions(taskId);
        assertEq(submissions.length, 2);
        assertEq(submissions[0].agent, agentA);
        assertEq(submissions[1].agent, agentB);
        assertEq(pool.getTask(taskId).submissionCount, 2);
    }

    function testSubmissionRejectedAfterDeadlineShouldFail() public {
        uint256 taskId = _createTask();
        vm.warp(deadline + 1);

        vm.prank(agentA);
        vm.expectRevert(ProofPool.TaskNotOpen.selector);
        pool.submitProof(taskId, "late proof");
    }

    function testCloseTaskSucceedsAfterDeadline() public {
        uint256 taskId = _createTask();
        vm.warp(deadline + 1);

        pool.closeTask(taskId);

        assertEq(uint256(pool.getTask(taskId).state), uint256(ProofPool.TaskState.CLOSED));
    }

    function testCloseTaskRevertsBeforeDeadline() public {
        uint256 taskId = _createTask();

        vm.expectRevert(ProofPool.DeadlineNotPassed.selector);
        pool.closeTask(taskId);
    }

    function testCloseTaskRevertsOnApprovedTask() public {
        uint256 taskId = _createTask();
        _submit(taskId, agentA, "proof");

        vm.prank(creator);
        pool.approve(taskId, agentA);

        vm.warp(deadline + 1);
        vm.expectRevert(ProofPool.TaskNotOpen.selector);
        pool.closeTask(taskId);
    }

    function testCloseTaskRevertsOnCancelledTask() public {
        uint256 taskId = _createTask();

        vm.prank(creator);
        pool.cancel(taskId);

        vm.warp(deadline + 1);
        vm.expectRevert(ProofPool.TaskNotOpen.selector);
        pool.closeTask(taskId);
    }

    function testApprovalOfOneAgentAndUsdcPayout() public {
        uint256 taskId = _createTaskWithTwoSubmissions();

        vm.prank(creator);
        pool.approve(taskId, agentA);

        assertEq(usdc.balanceOf(agentA), REWARD);
        assertEq(usdc.balanceOf(address(pool)), 0);
        assertEq(pool.getTask(taskId).winner, agentA);
        assertEq(uint256(pool.getTask(taskId).state), uint256(ProofPool.TaskState.APPROVED));
    }

    function testReputationIncrementForApprovedAgentOnly() public {
        uint256 taskId = _createTaskWithTwoSubmissions();

        vm.prank(creator);
        pool.approve(taskId, agentA);

        assertEq(registry.getAgent(agentA).reputation, int256(1));
        assertEq(registry.getAgent(agentA).totalTasksCompleted, 1);
        assertEq(registry.getAgent(agentA).totalEarned, REWARD);
        assertEq(registry.getAgent(agentB).reputation, int256(0));
    }

    function testNonWinningAgentsReceiveNoReputationPenalty() public {
        uint256 taskId = _createTaskWithTwoSubmissions();

        vm.prank(creator);
        pool.approve(taskId, agentA);

        ProofPool.Submission memory loserSubmission = pool.getSubmission(taskId, agentB);
        assertEq(uint256(loserSubmission.status), uint256(ProofPool.SubmissionStatus.CLOSED));
        assertEq(registry.getAgent(agentB).reputation, int256(0));
    }

    function testExplicitRejectionOfOneAgentAndReputationDecrement() public {
        uint256 taskId = _createTaskWithTwoSubmissions();

        vm.prank(creator);
        pool.reject(taskId, agentB);

        assertEq(registry.getAgent(agentB).reputation, int256(-1));
        assertEq(uint256(pool.getSubmission(taskId, agentB).status), uint256(ProofPool.SubmissionStatus.REJECTED));
        assertEq(uint256(pool.getSubmission(taskId, agentA).status), uint256(ProofPool.SubmissionStatus.PENDING));
    }

    function testRejectedAgentCannotResubmit() public {
        uint256 taskId = _createTaskWithTwoSubmissions();

        vm.prank(creator);
        pool.reject(taskId, agentB);

        vm.prank(agentB);
        vm.expectRevert(ProofPool.SubmissionExists.selector);
        pool.submitProof(taskId, "new proof");
    }

    function testUnauthorizedApprovalAttemptShouldFail() public {
        uint256 taskId = _createTask();
        _submit(taskId, agentA, "proof");

        vm.prank(stranger);
        vm.expectRevert(ProofPool.NotTaskOwner.selector);
        pool.approve(taskId, agentA);
    }

    function testDuplicateSubmissionBySameAgentShouldFail() public {
        uint256 taskId = _createTask();
        _submit(taskId, agentA, "proof");

        vm.prank(agentA);
        vm.expectRevert(ProofPool.SubmissionExists.selector);
        pool.submitProof(taskId, "second proof");
    }

    function testUnregisteredAgentSubmissionShouldFail() public {
        uint256 taskId = _createTask();

        vm.prank(stranger);
        vm.expectRevert(ProofPool.NotRegisteredAgent.selector);
        pool.submitProof(taskId, "proof");
    }

    function testCancellationAndEscrowRefundFromOpenState() public {
        uint256 taskId = _createTask();

        vm.prank(creator);
        pool.cancel(taskId);

        assertEq(usdc.balanceOf(creator), 1_000_000_000);
        assertEq(usdc.balanceOf(address(pool)), 0);
        assertEq(uint256(pool.getTask(taskId).state), uint256(ProofPool.TaskState.CANCELLED));
    }

    function testCancellationAndEscrowRefundFromClosedState() public {
        uint256 taskId = _createTask();
        vm.warp(deadline + 1);
        pool.closeTask(taskId);

        vm.prank(creator);
        pool.cancel(taskId);

        assertEq(usdc.balanceOf(creator), 1_000_000_000);
        assertEq(usdc.balanceOf(address(pool)), 0);
        assertEq(uint256(pool.getTask(taskId).state), uint256(ProofPool.TaskState.CANCELLED));
    }

    function testCancelAttemptAfterApprovalShouldFail() public {
        uint256 taskId = _createTask();
        _submit(taskId, agentA, "proof");

        vm.prank(creator);
        pool.approve(taskId, agentA);

        vm.prank(creator);
        vm.expectRevert(ProofPool.AlreadyFinalized.selector);
        pool.cancel(taskId);
    }

    function _createTaskWithTwoSubmissions() internal returns (uint256 taskId) {
        taskId = _createTask();
        _submit(taskId, agentA, "ipfs://agent-a");
        _submit(taskId, agentB, "ipfs://agent-b");
    }

    function _createTask() internal returns (uint256 taskId) {
        vm.startPrank(creator);
        usdc.approve(address(pool), REWARD);
        taskId = pool.createTask(
            "Analyze suspicious Arc wallet activity",
            "Review transactions and cluster likely related wallets.",
            "Submit a clear report with addresses, evidence, and risk notes.",
            REWARD,
            deadline
        );
        vm.stopPrank();
    }

    function _submit(uint256 taskId, address agent, string memory proof) internal {
        vm.prank(agent);
        pool.submitProof(taskId, proof);
    }
}
