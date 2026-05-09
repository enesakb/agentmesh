// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ReputationRegistry} from "../src/reputation/ReputationRegistry.sol";
import {IReputationRegistry} from "../src/interfaces/IReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    ReputationRegistry rep;

    address constant OWNER = address(0xDEAD);
    address constant LOGGER = address(0x10661);
    address constant AGENT = address(0xA1);
    address constant CP1 = address(0xC1);
    address constant CP2 = address(0xC2);

    function setUp() public {
        rep = new ReputationRegistry(OWNER);
        vm.prank(OWNER);
        rep.authorizeLogger(LOGGER, true);
    }

    function test_logSuccessUpdatesStats() public {
        vm.prank(LOGGER);
        rep.logSuccess(AGENT, CP1, 1 ether);

        IReputationRegistry.Stats memory s = rep.getReputation(AGENT);
        assertEq(s.totalTxCount, 1);
        assertEq(s.successCount, 1);
        assertEq(s.failureCount, 0);
        assertEq(s.totalVolumeWei, 1 ether);
        assertEq(s.uniqueCounterpartiesCount, 1);
        assertGt(s.firstSeenTimestamp, 0);
    }

    function test_logFailureUpdatesStats() public {
        vm.prank(LOGGER);
        rep.logFailure(AGENT, CP1, 0.5 ether);
        IReputationRegistry.Stats memory s = rep.getReputation(AGENT);
        assertEq(s.totalTxCount, 1);
        assertEq(s.failureCount, 1);
        assertEq(s.successCount, 0);
    }

    function test_uniqueCounterpartiesCounted() public {
        vm.startPrank(LOGGER);
        rep.logSuccess(AGENT, CP1, 1 ether);
        rep.logSuccess(AGENT, CP1, 1 ether); // same cp again
        rep.logSuccess(AGENT, CP2, 1 ether); // different cp
        vm.stopPrank();

        IReputationRegistry.Stats memory s = rep.getReputation(AGENT);
        assertEq(s.totalTxCount, 3);
        assertEq(s.uniqueCounterpartiesCount, 2);
    }

    function test_revert_unauthorized() public {
        vm.expectRevert(IReputationRegistry.NotAuthorizedLogger.selector);
        rep.logSuccess(AGENT, CP1, 1 ether);
    }

    function test_revert_zeroAddress() public {
        vm.prank(LOGGER);
        vm.expectRevert(IReputationRegistry.ZeroAddress.selector);
        rep.logSuccess(address(0), CP1, 1 ether);
    }

    function test_score_brandNewAgent() public {
        assertEq(rep.getReputationScore(AGENT), 0);
    }

    function test_score_singleSuccessIsLow() public {
        vm.prank(LOGGER);
        rep.logSuccess(AGENT, CP1, 1 ether);
        // successRate = 10_000, confidence = sqrt(1) = 1
        // score = (10_000 * 1)/10 = 1000  → 10% of ceiling
        assertEq(rep.getReputationScore(AGENT), 1000);
    }

    function test_score_hundredSuccessHitsCeiling() public {
        vm.startPrank(LOGGER);
        for (uint256 i = 0; i < 100; ++i) {
            rep.logSuccess(AGENT, address(uint160(0xC0 + i)), 1 ether);
        }
        vm.stopPrank();
        // sqrt(100)=10, volumeBonus=1000, successRate=10000 → score = 10000
        assertEq(rep.getReputationScore(AGENT), 10_000);
    }

    function test_score_mixedSuccessAndFailure() public {
        vm.startPrank(LOGGER);
        for (uint256 i = 0; i < 90; ++i) rep.logSuccess(AGENT, address(uint160(0xC0 + i)), 1 ether);
        for (uint256 i = 0; i < 10; ++i) rep.logFailure(AGENT, address(uint160(0xD0 + i)), 1 ether);
        vm.stopPrank();
        // successRate = 9000, volumeBonus = sqrt(100)*100 = 1000, score = 9000
        assertEq(rep.getReputationScore(AGENT), 9000);
    }

    function test_authorizeLoggerAccessControl() public {
        address evil = address(0xBAD);
        vm.expectRevert();
        vm.prank(evil);
        rep.authorizeLogger(evil, true);
    }

    function test_revokeLogger() public {
        vm.prank(OWNER);
        rep.authorizeLogger(LOGGER, false);
        vm.prank(LOGGER);
        vm.expectRevert(IReputationRegistry.NotAuthorizedLogger.selector);
        rep.logSuccess(AGENT, CP1, 1 ether);
    }
}
