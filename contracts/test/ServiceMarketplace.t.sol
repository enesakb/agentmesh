// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ServiceMarketplace} from "../src/marketplace/ServiceMarketplace.sol";
import {IServiceMarketplace} from "../src/interfaces/IServiceMarketplace.sol";
import {ReputationRegistry} from "../src/reputation/ReputationRegistry.sol";

contract ServiceMarketplaceTest is Test {
    ServiceMarketplace market;
    ReputationRegistry rep;

    address constant OWNER = address(0xDEAD);
    address constant PROVIDER = address(0xAAAA);
    address constant CONSUMER = address(0xBBBB);

    function setUp() public {
        rep = new ReputationRegistry(OWNER);
        market = new ServiceMarketplace(address(rep));
        vm.prank(OWNER);
        rep.authorizeLogger(address(market), true);

        vm.deal(CONSUMER, 100 ether);
    }

    function test_createListing() public {
        vm.prank(PROVIDER);
        uint256 id = market.createListing("https://provider/svc", 1 ether);
        assertEq(id, 1);
        IServiceMarketplace.Listing memory l = market.getListing(id);
        assertEq(l.provider, PROVIDER);
        assertEq(l.priceWei, 1 ether);
        assertTrue(l.active);
    }

    function test_revert_emptyURI() public {
        vm.prank(PROVIDER);
        vm.expectRevert(IServiceMarketplace.EmptyServiceURI.selector);
        market.createListing("", 1 ether);
    }

    function test_revert_zeroPrice() public {
        vm.prank(PROVIDER);
        vm.expectRevert(IServiceMarketplace.ZeroPrice.selector);
        market.createListing("u", 0);
    }

    function test_deactivateListing() public {
        vm.prank(PROVIDER);
        uint256 id = market.createListing("u", 1 ether);
        vm.prank(PROVIDER);
        market.deactivateListing(id);
        assertFalse(market.getListing(id).active);
    }

    function test_revert_deactivateNotProvider() public {
        vm.prank(PROVIDER);
        uint256 id = market.createListing("u", 1 ether);
        vm.prank(CONSUMER);
        vm.expectRevert(IServiceMarketplace.NotProvider.selector);
        market.deactivateListing(id);
    }

    function test_placeOrder() public {
        vm.prank(PROVIDER);
        uint256 listingId = market.createListing("u", 1 ether);

        vm.prank(CONSUMER);
        uint256 orderId = market.placeOrder{value: 1 ether}(listingId);

        IServiceMarketplace.Order memory o = market.getOrder(orderId);
        assertEq(o.consumer, CONSUMER);
        assertEq(o.provider, PROVIDER);
        assertEq(o.priceWei, 1 ether);
        assertEq(uint8(o.status), uint8(IServiceMarketplace.OrderStatus.Created));
        assertEq(address(market).balance, 1 ether);
    }

    function test_revert_placeOrderWrongAmount() public {
        vm.prank(PROVIDER);
        uint256 listingId = market.createListing("u", 1 ether);

        vm.prank(CONSUMER);
        vm.expectRevert(IServiceMarketplace.WrongPaymentAmount.selector);
        market.placeOrder{value: 0.5 ether}(listingId);
    }

    function test_revert_placeOrderInactive() public {
        vm.prank(PROVIDER);
        uint256 listingId = market.createListing("u", 1 ether);
        vm.prank(PROVIDER);
        market.deactivateListing(listingId);

        vm.prank(CONSUMER);
        vm.expectRevert(IServiceMarketplace.ListingNotActive.selector);
        market.placeOrder{value: 1 ether}(listingId);
    }

    function test_completeOrder_releasesEscrowAndLogsRep() public {
        vm.prank(PROVIDER);
        uint256 listingId = market.createListing("u", 1 ether);
        vm.prank(CONSUMER);
        uint256 orderId = market.placeOrder{value: 1 ether}(listingId);

        uint256 providerBalBefore = PROVIDER.balance;
        vm.prank(PROVIDER);
        market.completeOrder(orderId, "proof:abc");

        assertEq(PROVIDER.balance - providerBalBefore, 1 ether);
        assertEq(uint8(market.getOrder(orderId).status), uint8(IServiceMarketplace.OrderStatus.Completed));

        assertEq(rep.getReputation(PROVIDER).successCount, 1);
        assertEq(rep.getReputation(CONSUMER).successCount, 1);
    }

    function test_revert_completeNotProvider() public {
        vm.prank(PROVIDER);
        uint256 listingId = market.createListing("u", 1 ether);
        vm.prank(CONSUMER);
        uint256 orderId = market.placeOrder{value: 1 ether}(listingId);

        vm.prank(CONSUMER);
        vm.expectRevert(IServiceMarketplace.NotProvider.selector);
        market.completeOrder(orderId, "proof");
    }

    function test_refundOrder_afterTimeout() public {
        vm.prank(PROVIDER);
        uint256 listingId = market.createListing("u", 1 ether);
        vm.prank(CONSUMER);
        uint256 orderId = market.placeOrder{value: 1 ether}(listingId);

        vm.warp(block.timestamp + 2 hours);

        uint256 consumerBalBefore = CONSUMER.balance;
        vm.prank(CONSUMER);
        market.refundOrder(orderId);

        assertEq(CONSUMER.balance - consumerBalBefore, 1 ether);
        assertEq(uint8(market.getOrder(orderId).status), uint8(IServiceMarketplace.OrderStatus.Refunded));
        assertEq(rep.getReputation(PROVIDER).failureCount, 1);
    }

    function test_revert_refundBeforeTimeout() public {
        vm.prank(PROVIDER);
        uint256 listingId = market.createListing("u", 1 ether);
        vm.prank(CONSUMER);
        uint256 orderId = market.placeOrder{value: 1 ether}(listingId);

        vm.prank(CONSUMER);
        vm.expectRevert(IServiceMarketplace.TimeoutNotReached.selector);
        market.refundOrder(orderId);
    }

    function test_revert_doubleComplete() public {
        vm.prank(PROVIDER);
        uint256 listingId = market.createListing("u", 1 ether);
        vm.prank(CONSUMER);
        uint256 orderId = market.placeOrder{value: 1 ether}(listingId);

        vm.startPrank(PROVIDER);
        market.completeOrder(orderId, "p");
        vm.expectRevert(IServiceMarketplace.OrderNotActive.selector);
        market.completeOrder(orderId, "p");
        vm.stopPrank();
    }

    function test_activeListingsByProvider() public {
        vm.startPrank(PROVIDER);
        market.createListing("u1", 1 ether);
        market.createListing("u2", 2 ether);
        uint256 id3 = market.createListing("u3", 3 ether);
        market.deactivateListing(id3);
        vm.stopPrank();

        uint256[] memory active = market.getActiveListingsByProvider(PROVIDER);
        assertEq(active.length, 2);
    }
}
