// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/identity/AgentRegistry.sol";
import {AgentAccount} from "../src/wallet/AgentAccount.sol";
import {AgentAccountFactory} from "../src/wallet/AgentAccountFactory.sol";
import {SpendingPolicyModule} from "../src/wallet/modules/SpendingPolicyModule.sol";
import {ServiceMarketplace} from "../src/marketplace/ServiceMarketplace.sol";
import {IServiceMarketplace} from "../src/interfaces/IServiceMarketplace.sol";
import {ReputationRegistry} from "../src/reputation/ReputationRegistry.sol";

/// @notice End-to-end on-chain integration: two agents register, one lists a
///         service, the other discovers and orders, payment escrowed and
///         released, reputation logged for both.
contract IntegrationTest is Test {
    AgentRegistry registry;
    ReputationRegistry rep;
    ServiceMarketplace market;
    SpendingPolicyModule policy;
    AgentAccount accountImpl;
    AgentAccountFactory factory;

    address constant DEPLOYER = address(0xD3);
    address ownerAlpha;
    uint256 alphaPk;
    address ownerBeta;
    uint256 betaPk;

    AgentAccount agentAlpha;
    AgentAccount agentBeta;

    bytes32 constant CAP_WEATHER = keccak256("data.weather");

    function setUp() public {
        (ownerAlpha, alphaPk) = makeAddrAndKey("alpha-owner");
        (ownerBeta, betaPk) = makeAddrAndKey("beta-owner");

        vm.startPrank(DEPLOYER);
        registry = new AgentRegistry();
        rep = new ReputationRegistry(DEPLOYER);
        market = new ServiceMarketplace(address(rep));
        policy = new SpendingPolicyModule();
        accountImpl = new AgentAccount();
        factory = new AgentAccountFactory(address(accountImpl));
        rep.authorizeLogger(address(market), true);
        vm.stopPrank();

        agentAlpha = AgentAccount(payable(factory.createAccount(ownerAlpha, 1)));
        agentBeta = AgentAccount(payable(factory.createAccount(ownerBeta, 1)));

        vm.deal(address(agentAlpha), 10 ether);
        vm.deal(address(agentBeta), 10 ether);
    }

    function test_endToEnd_registerListBuyComplete() public {
        // 1. Alpha registers in identity registry (called from agent account)
        bytes32[] memory caps = new bytes32[](1);
        caps[0] = CAP_WEATHER;
        bytes memory regCall =
            abi.encodeCall(AgentRegistry.register, ("alpha", "ipfs://a", caps));
        vm.prank(ownerAlpha);
        agentAlpha.execute(address(registry), 0, regCall);
        assertTrue(registry.isRegistered(address(agentAlpha)));

        // 2. Beta registers
        bytes32[] memory bcaps = new bytes32[](1);
        bcaps[0] = keccak256("consumer");
        bytes memory regCallBeta =
            abi.encodeCall(AgentRegistry.register, ("beta", "ipfs://b", bcaps));
        vm.prank(ownerBeta);
        agentBeta.execute(address(registry), 0, regCallBeta);

        // 3. Alpha installs policy and creates marketplace listing
        bytes memory setPolicy =
            abi.encodeCall(SpendingPolicyModule.setPolicy, (5 ether, 1 ether));
        vm.prank(ownerAlpha);
        agentAlpha.execute(address(policy), 0, setPolicy);
        vm.prank(ownerAlpha);
        agentAlpha.installModule(4 /* MODULE_TYPE_HOOK */, address(policy), "");

        bytes memory listCall = abi.encodeCall(
            ServiceMarketplace.createListing, ("https://alpha/weather", 0.01 ether)
        );
        vm.prank(ownerAlpha);
        agentAlpha.execute(address(market), 0, listCall);

        uint256[] memory listings = market.getActiveListingsByProvider(address(agentAlpha));
        assertEq(listings.length, 1);
        uint256 listingId = listings[0];

        // 4. Beta discovers via capability
        address[] memory providers = registry.findByCapability(CAP_WEATHER);
        assertEq(providers.length, 1);
        assertEq(providers[0], address(agentAlpha));

        // 5. Beta places order (pays 0.01 ETH from its smart account)
        bytes memory placeOrderCall =
            abi.encodeCall(ServiceMarketplace.placeOrder, (listingId));
        // Beta needs spending policy too for the hook to be useful — skip for MVP demo path
        vm.prank(ownerBeta);
        agentBeta.execute(address(market), 0.01 ether, placeOrderCall);

        // Find orderId
        uint256 orderId = market.nextOrderId() - 1;
        IServiceMarketplace.Order memory order = market.getOrder(orderId);
        assertEq(order.consumer, address(agentBeta));
        assertEq(order.provider, address(agentAlpha));

        // 6. Alpha completes the order
        bytes memory completeCall =
            abi.encodeCall(ServiceMarketplace.completeOrder, (orderId, "weather:Berlin:22C"));
        uint256 alphaBalBefore = address(agentAlpha).balance;
        vm.prank(ownerAlpha);
        agentAlpha.execute(address(market), 0, completeCall);

        // 7. Verify settlement
        assertEq(address(agentAlpha).balance - alphaBalBefore, 0.01 ether);
        assertEq(uint8(market.getOrder(orderId).status), uint8(IServiceMarketplace.OrderStatus.Completed));

        // 8. Reputation
        assertEq(rep.getReputation(address(agentAlpha)).successCount, 1);
        assertEq(rep.getReputation(address(agentBeta)).successCount, 1);
        assertGt(rep.getReputationScore(address(agentAlpha)), 0);
    }
}
