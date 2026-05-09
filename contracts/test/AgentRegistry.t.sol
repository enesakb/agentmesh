// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/identity/AgentRegistry.sol";
import {IAgentRegistry} from "../src/interfaces/IAgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;

    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);

    bytes32 constant CAP_WEATHER = keccak256("data.weather");
    bytes32 constant CAP_PRICE = keccak256("data.price");
    bytes32 constant CAP_IMAGE = keccak256("compute.image");

    function setUp() public {
        registry = new AgentRegistry();
    }

    function _caps2(bytes32 a, bytes32 b) internal pure returns (bytes32[] memory arr) {
        arr = new bytes32[](2);
        arr[0] = a;
        arr[1] = b;
    }

    function _caps1(bytes32 a) internal pure returns (bytes32[] memory arr) {
        arr = new bytes32[](1);
        arr[0] = a;
    }

    function test_registerHappyPath() public {
        vm.prank(ALICE);
        registry.register("alpha", "ipfs://meta", _caps2(CAP_WEATHER, CAP_PRICE));

        IAgentRegistry.Agent memory a = registry.lookup(ALICE);
        assertEq(a.name, "alpha");
        assertEq(a.metadataURI, "ipfs://meta");
        assertEq(a.capabilities.length, 2);
        assertEq(a.capabilities[0], CAP_WEATHER);
        assertEq(a.capabilities[1], CAP_PRICE);
        assertTrue(registry.isRegistered(ALICE));
        assertEq(registry.totalAgents(), 1);
    }

    function test_registerEmits() public {
        vm.expectEmit(true, false, true, true);
        emit IAgentRegistry.AgentRegistered(ALICE, "alpha", address(0));
        vm.prank(ALICE);
        registry.register("alpha", "ipfs://meta", _caps1(CAP_WEATHER));
    }

    function test_revert_emptyName() public {
        vm.prank(ALICE);
        vm.expectRevert(IAgentRegistry.EmptyName.selector);
        registry.register("", "ipfs://m", _caps1(CAP_WEATHER));
    }

    function test_revert_nameTooLong() public {
        string memory tooLong = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklm"; // 65
        vm.prank(ALICE);
        vm.expectRevert(IAgentRegistry.NameTooLong.selector);
        registry.register(tooLong, "ipfs://m", _caps1(CAP_WEATHER));
    }

    function test_revert_alreadyRegistered() public {
        vm.startPrank(ALICE);
        registry.register("alpha", "ipfs://m", _caps1(CAP_WEATHER));
        vm.expectRevert(IAgentRegistry.AgentAlreadyRegistered.selector);
        registry.register("alpha2", "ipfs://m", _caps1(CAP_WEATHER));
        vm.stopPrank();
    }

    function test_revert_nameTaken() public {
        vm.prank(ALICE);
        registry.register("alpha", "ipfs://m", _caps1(CAP_WEATHER));

        vm.prank(BOB);
        vm.expectRevert(IAgentRegistry.NameAlreadyTaken.selector);
        registry.register("alpha", "ipfs://m", _caps1(CAP_WEATHER));
    }

    function test_revert_invalidCapability() public {
        bytes32[] memory caps = new bytes32[](1);
        caps[0] = bytes32(0);
        vm.prank(ALICE);
        vm.expectRevert(IAgentRegistry.InvalidCapability.selector);
        registry.register("alpha", "ipfs://m", caps);
    }

    function test_findByCapability() public {
        vm.prank(ALICE);
        registry.register("alpha", "ipfs://a", _caps2(CAP_WEATHER, CAP_PRICE));
        vm.prank(BOB);
        registry.register("bob", "ipfs://b", _caps1(CAP_WEATHER));

        address[] memory weatherAgents = registry.findByCapability(CAP_WEATHER);
        assertEq(weatherAgents.length, 2);

        address[] memory priceAgents = registry.findByCapability(CAP_PRICE);
        assertEq(priceAgents.length, 1);
        assertEq(priceAgents[0], ALICE);

        address[] memory empty = registry.findByCapability(CAP_IMAGE);
        assertEq(empty.length, 0);
    }

    function test_lookupByName() public {
        vm.prank(ALICE);
        registry.register("alpha", "ipfs://a", _caps1(CAP_WEATHER));
        IAgentRegistry.Agent memory a = registry.lookupByName("alpha");
        assertEq(a.agentAddress, ALICE);
    }

    function test_revert_lookupUnknown() public {
        vm.expectRevert(IAgentRegistry.AgentNotRegistered.selector);
        registry.lookup(BOB);
    }

    function test_update_changesMetadata() public {
        vm.startPrank(ALICE);
        registry.register("alpha", "ipfs://v1", _caps1(CAP_WEATHER));
        registry.update("ipfs://v2", _caps1(CAP_PRICE));
        vm.stopPrank();

        IAgentRegistry.Agent memory a = registry.lookup(ALICE);
        assertEq(a.metadataURI, "ipfs://v2");
        assertEq(a.capabilities.length, 1);
        assertEq(a.capabilities[0], CAP_PRICE);
    }

    function test_update_movesCapabilityIndex() public {
        vm.startPrank(ALICE);
        registry.register("alpha", "ipfs://v1", _caps1(CAP_WEATHER));
        registry.update("ipfs://v1", _caps1(CAP_PRICE));
        vm.stopPrank();

        assertEq(registry.findByCapability(CAP_WEATHER).length, 0);
        address[] memory pricers = registry.findByCapability(CAP_PRICE);
        assertEq(pricers.length, 1);
        assertEq(pricers[0], ALICE);
    }

    function test_revert_updateUnregistered() public {
        vm.prank(BOB);
        vm.expectRevert(IAgentRegistry.AgentNotRegistered.selector);
        registry.update("ipfs://m", _caps1(CAP_WEATHER));
    }
}
