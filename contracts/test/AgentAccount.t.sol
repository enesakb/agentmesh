// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentAccount} from "../src/wallet/AgentAccount.sol";
import {AgentAccountFactory} from "../src/wallet/AgentAccountFactory.sol";
import {SpendingPolicyModule} from "../src/wallet/modules/SpendingPolicyModule.sol";

contract Sink {
    uint256 public received;

    receive() external payable {
        received += msg.value;
    }

    function ping() external payable returns (uint256) {
        return msg.value;
    }
}

contract AgentAccountTest is Test {
    AgentAccount impl;
    AgentAccountFactory factory;
    SpendingPolicyModule policy;
    Sink sink;

    address owner = address(0xA11CE);
    address attacker = address(0xBAD);

    function setUp() public {
        impl = new AgentAccount();
        factory = new AgentAccountFactory(address(impl));
        policy = new SpendingPolicyModule();
        sink = new Sink();
    }

    function _deploy(address ownerAddr, uint256 salt) internal returns (AgentAccount) {
        address acct = factory.createAccount(ownerAddr, salt);
        vm.deal(acct, 100 ether);
        return AgentAccount(payable(acct));
    }

    function test_factoryDeterministic() public {
        address predicted = factory.getAddress(owner, 1);
        address actual = factory.createAccount(owner, 1);
        assertEq(predicted, actual);

        // calling again returns same address (idempotent)
        address actual2 = factory.createAccount(owner, 1);
        assertEq(actual2, actual);
    }

    function test_initSetsOwner() public {
        AgentAccount acct = _deploy(owner, 1);
        assertEq(acct.owner(), owner);
    }

    function test_revert_doubleInit() public {
        AgentAccount acct = _deploy(owner, 1);
        vm.expectRevert(AgentAccount.AlreadyInitialized.selector);
        acct.initialize(attacker);
    }

    function test_executeFromOwner() public {
        AgentAccount acct = _deploy(owner, 1);
        vm.prank(owner);
        acct.execute(address(sink), 1 ether, "");
        assertEq(address(sink).balance, 1 ether);
    }

    function test_revert_executeFromNonOwner() public {
        AgentAccount acct = _deploy(owner, 1);
        vm.prank(attacker);
        vm.expectRevert(AgentAccount.NotAuthorized.selector);
        acct.execute(address(sink), 1 ether, "");
    }

    function test_executeBatch() public {
        AgentAccount acct = _deploy(owner, 1);
        address[] memory targets = new address[](2);
        targets[0] = address(sink);
        targets[1] = address(sink);
        uint256[] memory values = new uint256[](2);
        values[0] = 0.5 ether;
        values[1] = 0.3 ether;
        bytes[] memory datas = new bytes[](2);
        datas[0] = "";
        datas[1] = "";

        vm.prank(owner);
        acct.executeBatch(targets, values, datas);
        assertEq(address(sink).balance, 0.8 ether);
    }

    function test_installHookModule_blocksOversend() public {
        AgentAccount acct = _deploy(owner, 1);

        // First set policy on the module FROM the account so it lives under acct's mapping.
        bytes memory setPolicyCalldata =
            abi.encodeCall(SpendingPolicyModule.setPolicy, (10 ether, 1 ether));
        vm.prank(owner);
        acct.execute(address(policy), 0, setPolicyCalldata);

        // Install hook
        vm.prank(owner);
        acct.installModule(4 /* MODULE_TYPE_HOOK */, address(policy), "");

        // Within limit — succeeds
        vm.prank(owner);
        acct.execute(address(sink), 0.5 ether, "");

        // Over per-tx limit — reverts
        vm.prank(owner);
        vm.expectRevert();
        acct.execute(address(sink), 5 ether, "");
    }

    function test_uninstallHook_clearsList() public {
        AgentAccount acct = _deploy(owner, 1);
        bytes memory setPolicyCalldata =
            abi.encodeCall(SpendingPolicyModule.setPolicy, (10 ether, 1 ether));
        vm.prank(owner);
        acct.execute(address(policy), 0, setPolicyCalldata);

        vm.startPrank(owner);
        acct.installModule(4 /* MODULE_TYPE_HOOK */, address(policy), "");
        assertEq(acct.getHookModules().length, 1);

        acct.uninstallModule(4 /* MODULE_TYPE_HOOK */, address(policy), "");
        assertEq(acct.getHookModules().length, 0);
        // After uninstall, large send works
        acct.execute(address(sink), 5 ether, "");
        vm.stopPrank();
    }

    function test_revert_unsupportedModuleType() public {
        AgentAccount acct = _deploy(owner, 1);
        vm.prank(owner);
        vm.expectRevert(AgentAccount.UnsupportedModuleType.selector);
        acct.installModule(99, address(policy), "");
    }

    function test_setRecoveryModule_onlyOwnerOrSelf() public {
        AgentAccount acct = _deploy(owner, 1);
        vm.prank(owner);
        acct.setRecoveryModule(address(0x1234));
        assertEq(acct.recoveryModule(), address(0x1234));

        vm.prank(attacker);
        vm.expectRevert(AgentAccount.NotAuthorized.selector);
        acct.setRecoveryModule(address(0xBEEF));
    }

    function test_revert_rotateOwnerByNonRecoveryModule() public {
        AgentAccount acct = _deploy(owner, 1);
        vm.prank(owner);
        acct.setRecoveryModule(address(0x1234));

        vm.prank(attacker);
        vm.expectRevert(AgentAccount.NotRecoveryModule.selector);
        acct.rotateOwnerByRecovery(attacker);
    }
}
