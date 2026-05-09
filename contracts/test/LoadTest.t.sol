// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/identity/AgentRegistry.sol";
import {AgentAccount} from "../src/wallet/AgentAccount.sol";
import {AgentAccountFactory} from "../src/wallet/AgentAccountFactory.sol";
import {ServiceMarketplace} from "../src/marketplace/ServiceMarketplace.sol";
import {IServiceMarketplace} from "../src/interfaces/IServiceMarketplace.sol";
import {ReputationRegistry} from "../src/reputation/ReputationRegistry.sol";

/// @notice Load / stress test. Spawns many agents, runs a heavy workload of
///         orders + completions + refunds, asserts protocol invariants hold.
///         Numbers are reported via console.log so the test acts as both a
///         conformance test and a benchmark. Run with:
///         `forge test --match-contract LoadTest -vv`
contract LoadTest is Test {
    AgentRegistry registry;
    ReputationRegistry rep;
    ServiceMarketplace market;
    AgentAccount accountImpl;
    AgentAccountFactory factory;

    address constant DEPLOYER = address(0xD3);

    uint256 constant N_PROVIDERS = 50;
    uint256 constant N_CONSUMERS = 50;
    uint256 constant N_ORDERS = 200;

    address[N_PROVIDERS] providers;
    address[N_CONSUMERS] consumers;

    function setUp() public {
        vm.startPrank(DEPLOYER);
        registry = new AgentRegistry();
        rep = new ReputationRegistry(DEPLOYER);
        market = new ServiceMarketplace(address(rep));
        accountImpl = new AgentAccount();
        factory = new AgentAccountFactory(address(accountImpl));
        rep.authorizeLogger(address(market), true);
        vm.stopPrank();
    }

    function _providerOwner(uint256 i) internal returns (address) {
        (address o, ) = makeAddrAndKey(string(abi.encodePacked("p", vm.toString(i))));
        return o;
    }

    function _consumerOwner(uint256 i) internal returns (address) {
        (address o, ) = makeAddrAndKey(string(abi.encodePacked("c", vm.toString(i))));
        return o;
    }

    function _spawnProvider(uint256 i) internal {
        address owner = _providerOwner(i);
        address acct = factory.createAccount(owner, 1);
        vm.deal(acct, 10 ether);
        providers[i] = acct;

        bytes32[] memory caps = new bytes32[](1);
        caps[0] = keccak256(abi.encode("cap", i % 5));
        vm.prank(owner);
        AgentAccount(payable(acct)).execute(
            address(registry),
            0,
            abi.encodeCall(AgentRegistry.register, (string(abi.encodePacked("p", vm.toString(i))), "ipfs://m", caps))
        );

        uint256 price = ((i % 5) + 1) * 1e15;
        vm.prank(owner);
        AgentAccount(payable(acct)).execute(
            address(market),
            0,
            abi.encodeCall(
                ServiceMarketplace.createListing,
                (string(abi.encodePacked("svc://p", vm.toString(i))), price)
            )
        );
    }

    function _spawnConsumer(uint256 i) internal {
        address owner = _consumerOwner(i);
        address acct = factory.createAccount(owner, 2);
        vm.deal(acct, 50 ether);
        consumers[i] = acct;
    }

    function _findProviderIdx(address acct) internal view returns (uint256) {
        for (uint256 j = 0; j < N_PROVIDERS; j++) {
            if (providers[j] == acct) return j;
        }
        revert("not a provider");
    }

    function _findConsumerIdx(address acct) internal view returns (uint256) {
        for (uint256 j = 0; j < N_CONSUMERS; j++) {
            if (consumers[j] == acct) return j;
        }
        revert("not a consumer");
    }

    function _placeOrder(uint256 orderIdx) internal returns (uint256 orderId) {
        uint256 pIdx = (orderIdx * 7 + 3) % N_PROVIDERS;
        uint256 cIdx = (orderIdx * 13 + 5) % N_CONSUMERS;
        uint256 listingId = pIdx + 1; // listings created in same order as providers
        uint256 price = ((pIdx % 5) + 1) * 1e15;

        address consumer = consumers[cIdx];
        vm.prank(_consumerOwner(cIdx));
        AgentAccount(payable(consumer)).execute(
            address(market),
            price,
            abi.encodeCall(ServiceMarketplace.placeOrder, (listingId))
        );
        orderId = market.nextOrderId() - 1;
    }

    function _completeOrder(uint256 orderId) internal {
        IServiceMarketplace.Order memory o = market.getOrder(orderId);
        uint256 pIdx = _findProviderIdx(o.provider);
        vm.prank(_providerOwner(pIdx));
        AgentAccount(payable(o.provider)).execute(
            address(market),
            0,
            abi.encodeCall(ServiceMarketplace.completeOrder, (orderId, "proof"))
        );
    }

    function _refundOrder(uint256 orderId) internal {
        IServiceMarketplace.Order memory o = market.getOrder(orderId);
        uint256 cIdx = _findConsumerIdx(o.consumer);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(_consumerOwner(cIdx));
        AgentAccount(payable(o.consumer)).execute(
            address(market),
            0,
            abi.encodeCall(ServiceMarketplace.refundOrder, (orderId))
        );
    }

    /// @dev Heavy workload: 50 providers, 50 consumers, 200 orders.
    ///      ~70% completed, ~30% refunded. Asserts invariants hold under volume.
    function test_workload_200_orders() public {
        for (uint256 i = 0; i < N_PROVIDERS; i++) _spawnProvider(i);
        for (uint256 i = 0; i < N_CONSUMERS; i++) _spawnConsumer(i);

        uint256[] memory orderIds = new uint256[](N_ORDERS);
        for (uint256 i = 0; i < N_ORDERS; i++) {
            orderIds[i] = _placeOrder(i);
        }

        uint256 completedCount;
        uint256 refundedCount;
        for (uint256 i = 0; i < N_ORDERS; i++) {
            if (i % 10 < 7) {
                _completeOrder(orderIds[i]);
                completedCount++;
            } else {
                _refundOrder(orderIds[i]);
                refundedCount++;
            }
        }

        emit log_named_uint("providers spawned", N_PROVIDERS);
        emit log_named_uint("consumers spawned", N_CONSUMERS);
        emit log_named_uint("orders placed", N_ORDERS);
        emit log_named_uint("orders completed", completedCount);
        emit log_named_uint("orders refunded", refundedCount);
        emit log_named_uint("escrow remaining (wei)", address(market).balance);

        // INVARIANT 1: marketplace must hold zero ETH after every order resolved.
        assertEq(address(market).balance, 0, "marketplace escrow leak");

        // INVARIANT 2: success count == completed*2 (provider+consumer both logged)
        uint256 totalSuccess;
        uint256 totalFailure;
        for (uint256 i = 0; i < N_PROVIDERS; i++) {
            totalSuccess += rep.getReputation(providers[i]).successCount;
            totalFailure += rep.getReputation(providers[i]).failureCount;
        }
        for (uint256 i = 0; i < N_CONSUMERS; i++) {
            totalSuccess += rep.getReputation(consumers[i]).successCount;
            totalFailure += rep.getReputation(consumers[i]).failureCount;
        }
        assertEq(totalSuccess, completedCount * 2, "success count mismatch");
        assertEq(totalFailure, refundedCount, "failure count should equal refund count");

        // INVARIANT 3: registry has exactly N_PROVIDERS agents
        assertEq(registry.totalAgents(), N_PROVIDERS);

        emit log_named_uint("invariants holding", 3);
    }

    /// @dev Capability-search correctness under load: 80 agents share a hot capability.
    function test_workload_capability_search() public {
        bytes32 cap = keccak256(abi.encode("hot.cap"));
        uint256 n = 80;
        for (uint256 i = 0; i < n; i++) {
            (address owner, ) = makeAddrAndKey(string(abi.encodePacked("hot", vm.toString(i))));
            address acct = factory.createAccount(owner, 9);
            bytes32[] memory caps = new bytes32[](1);
            caps[0] = cap;
            vm.prank(owner);
            AgentAccount(payable(acct)).execute(
                address(registry),
                0,
                abi.encodeCall(AgentRegistry.register, (string(abi.encodePacked("hot", vm.toString(i))), "ipfs://m", caps))
            );
        }
        address[] memory found = registry.findByCapability(cap);
        assertEq(found.length, n);
    }
}
