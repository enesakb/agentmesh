// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentAccount} from "../src/wallet/AgentAccount.sol";
import {AgentAccountFactory} from "../src/wallet/AgentAccountFactory.sol";
import {RecoveryModule} from "../src/wallet/modules/RecoveryModule.sol";

contract RecoveryModuleTest is Test {
    AgentAccount impl;
    AgentAccountFactory factory;
    RecoveryModule recovery;
    AgentAccount acct;

    address owner = address(0xA11CE);
    address newOwner = address(0xB0B);
    address g1 = address(0x111);
    address g2 = address(0x222);
    address g3 = address(0x333);
    address attacker = address(0xBAD);

    function setUp() public {
        impl = new AgentAccount();
        factory = new AgentAccountFactory(address(impl));
        recovery = new RecoveryModule();

        acct = AgentAccount(payable(factory.createAccount(owner, 1)));
        vm.deal(address(acct), 1 ether);

        vm.prank(owner);
        acct.setRecoveryModule(address(recovery));

        // Account configures its own guardians (msg.sender = account address)
        address[] memory gs = new address[](3);
        (gs[0], gs[1], gs[2]) = (g1, g2, g3);
        bytes memory setGuardiansCall =
            abi.encodeCall(RecoveryModule.setGuardians, (gs, 2));
        vm.prank(owner);
        acct.execute(address(recovery), 0, setGuardiansCall);
    }

    function test_initiateAndExecute() public {
        vm.prank(g1);
        uint256 id = recovery.initiateRecovery(address(acct), newOwner);

        vm.prank(g2);
        recovery.supportRecovery(id);

        vm.warp(block.timestamp + 49 hours);
        recovery.executeRecovery(id);

        assertEq(acct.owner(), newOwner);
    }

    function test_revert_initiateByNonGuardian() public {
        vm.prank(attacker);
        vm.expectRevert(RecoveryModule.NotGuardian.selector);
        recovery.initiateRecovery(address(acct), newOwner);
    }

    function test_revert_executeBeforeDelay() public {
        vm.prank(g1);
        uint256 id = recovery.initiateRecovery(address(acct), newOwner);
        vm.prank(g2);
        recovery.supportRecovery(id);

        vm.expectRevert(RecoveryModule.TimelockNotExpired.selector);
        recovery.executeRecovery(id);
    }

    function test_revert_executeUnderThreshold() public {
        vm.prank(g1);
        uint256 id = recovery.initiateRecovery(address(acct), newOwner);

        vm.warp(block.timestamp + 49 hours);
        vm.expectRevert(RecoveryModule.InsufficientSupport.selector);
        recovery.executeRecovery(id);
    }

    function test_ownerCanCancel() public {
        vm.prank(g1);
        uint256 id = recovery.initiateRecovery(address(acct), newOwner);

        vm.prank(owner);
        recovery.cancelRecovery(id);

        vm.warp(block.timestamp + 49 hours);
        vm.expectRevert(RecoveryModule.RecoveryAlreadyResolved.selector);
        recovery.executeRecovery(id);
    }

    function test_revert_doubleSupport() public {
        vm.prank(g1);
        uint256 id = recovery.initiateRecovery(address(acct), newOwner);
        vm.prank(g1);
        vm.expectRevert(RecoveryModule.AlreadySupported.selector);
        recovery.supportRecovery(id);
    }

    function test_revert_setBadThreshold() public {
        address[] memory gs = new address[](2);
        (gs[0], gs[1]) = (g1, g2);
        vm.expectRevert(RecoveryModule.InvalidThreshold.selector);
        vm.prank(address(acct));
        recovery.setGuardians(gs, 5);
    }
}
