// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SpendingPolicyModule} from "../src/wallet/modules/SpendingPolicyModule.sol";

contract SpendingPolicyModuleTest is Test {
    SpendingPolicyModule policy;
    address account = address(0xA11CE);

    function setUp() public {
        policy = new SpendingPolicyModule();
        vm.prank(account);
        policy.setPolicy(10 ether, 1 ether);
    }

    function test_withinLimits() public {
        vm.prank(account);
        policy.checkAndUpdate(account, address(0xBEEF), 1 ether, "");
    }

    function test_revert_perTxExceeded() public {
        vm.prank(account);
        vm.expectRevert();
        policy.checkAndUpdate(account, address(0xBEEF), 2 ether, "");
    }

    function test_revert_dailyExceeded() public {
        vm.startPrank(account);
        for (uint256 i = 0; i < 10; ++i) {
            policy.checkAndUpdate(account, address(0xBEEF), 1 ether, "");
        }
        vm.expectRevert();
        policy.checkAndUpdate(account, address(0xBEEF), 1 ether, "");
        vm.stopPrank();
    }

    function test_windowResetsAfter24h() public {
        vm.startPrank(account);
        for (uint256 i = 0; i < 10; ++i) {
            policy.checkAndUpdate(account, address(0xBEEF), 1 ether, "");
        }
        vm.warp(block.timestamp + 25 hours);
        // Should reset and allow another 10 ether
        for (uint256 i = 0; i < 10; ++i) {
            policy.checkAndUpdate(account, address(0xBEEF), 1 ether, "");
        }
        vm.stopPrank();
    }

    function test_blacklist_blocks() public {
        vm.prank(account);
        policy.setBlacklist(address(0xDEAD), true);

        vm.prank(account);
        vm.expectRevert();
        policy.checkAndUpdate(account, address(0xDEAD), 0.1 ether, "");
    }

    function test_revert_callerMustBeAccount() public {
        vm.prank(address(0x9999));
        vm.expectRevert(SpendingPolicyModule.CallerMustBeAccount.selector);
        policy.checkAndUpdate(account, address(0xBEEF), 0.1 ether, "");
    }

    function test_revert_policyNotSet() public {
        address fresh = address(0xFEED);
        vm.prank(fresh);
        vm.expectRevert(SpendingPolicyModule.PolicyNotSet.selector);
        policy.checkAndUpdate(fresh, address(0xBEEF), 0.1 ether, "");
    }
}
