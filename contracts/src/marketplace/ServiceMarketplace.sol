// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IServiceMarketplace} from "../interfaces/IServiceMarketplace.sol";
import {IReputationRegistry} from "../interfaces/IReputationRegistry.sol";

/// @title ServiceMarketplace
/// @notice Layer 5 (Marketplace + Escrow). Native-ETH listings only in MVP.
///         Escrow flow:
///           1. Provider creates listing with priceWei.
///           2. Consumer placeOrder() and locks priceWei in escrow.
///           3. Provider serves the resource off-chain (e.g. via x402 middleware
///              that accepts the orderId as payment proof).
///           4. Provider calls completeOrder() → escrow released to provider,
///              ReputationRegistry.logSuccess for both sides.
///           5. If provider does not complete within ORDER_TIMEOUT, consumer can
///              refundOrder() → escrow returned, logFailure on provider.
contract ServiceMarketplace is IServiceMarketplace, ReentrancyGuard {
    IReputationRegistry public immutable reputation;
    uint64 public constant ORDER_TIMEOUT = 1 hours;

    uint256 public nextListingId = 1;
    uint256 public nextOrderId = 1;

    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => Order) private _orders;
    mapping(address => uint256[]) private _activeListingsByProvider;

    constructor(address reputationRegistry) {
        require(reputationRegistry != address(0), "rep=0");
        reputation = IReputationRegistry(reputationRegistry);
    }

    function createListing(string calldata serviceURI, uint256 priceWei) external returns (uint256 listingId) {
        if (bytes(serviceURI).length == 0) revert EmptyServiceURI();
        if (priceWei == 0) revert ZeroPrice();

        listingId = nextListingId++;
        _listings[listingId] = Listing({
            provider: msg.sender,
            serviceURI: serviceURI,
            priceWei: priceWei,
            active: true
        });
        _activeListingsByProvider[msg.sender].push(listingId);

        emit ListingCreated(listingId, msg.sender, priceWei, serviceURI);
    }

    function deactivateListing(uint256 listingId) external {
        Listing storage l = _listings[listingId];
        if (l.provider == address(0)) revert ListingNotFound();
        if (l.provider != msg.sender) revert NotProvider();
        if (!l.active) revert ListingNotActive();

        l.active = false;
        _removeActiveListing(msg.sender, listingId);
        emit ListingDeactivated(listingId, msg.sender);
    }

    function placeOrder(uint256 listingId) external payable nonReentrant returns (uint256 orderId) {
        Listing storage l = _listings[listingId];
        if (l.provider == address(0)) revert ListingNotFound();
        if (!l.active) revert ListingNotActive();
        if (msg.value != l.priceWei) revert WrongPaymentAmount();

        orderId = nextOrderId++;
        _orders[orderId] = Order({
            listingId: listingId,
            consumer: msg.sender,
            provider: l.provider,
            priceWei: l.priceWei,
            status: OrderStatus.Created,
            createdAt: uint64(block.timestamp),
            timeoutAt: uint64(block.timestamp + ORDER_TIMEOUT),
            proofHash: bytes32(0)
        });

        emit OrderPlaced(orderId, listingId, msg.sender, l.provider, l.priceWei);
    }

    function completeOrder(uint256 orderId, bytes calldata proof) external nonReentrant {
        Order storage o = _orders[orderId];
        if (o.status != OrderStatus.Created) revert OrderNotActive();
        if (o.provider != msg.sender) revert NotProvider();

        bytes32 proofHash = keccak256(proof);
        o.status = OrderStatus.Completed;
        o.proofHash = proofHash;

        (bool ok,) = o.provider.call{value: o.priceWei}("");
        if (!ok) revert PaymentTransferFailed();

        // Reputation: success on both sides
        reputation.logSuccess(o.provider, o.consumer, o.priceWei);
        reputation.logSuccess(o.consumer, o.provider, o.priceWei);

        emit OrderCompleted(orderId, o.provider, o.consumer, o.priceWei, proofHash);
    }

    function refundOrder(uint256 orderId) external nonReentrant {
        Order storage o = _orders[orderId];
        if (o.status != OrderStatus.Created) revert OrderNotActive();
        if (o.consumer != msg.sender) revert NotConsumer();
        if (block.timestamp < o.timeoutAt) revert TimeoutNotReached();

        o.status = OrderStatus.Refunded;

        (bool ok,) = o.consumer.call{value: o.priceWei}("");
        if (!ok) revert PaymentTransferFailed();

        // Reputation: failure on provider, neutral (no log) on consumer
        reputation.logFailure(o.provider, o.consumer, o.priceWei);

        emit OrderRefunded(orderId, o.provider, o.consumer, o.priceWei);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return _orders[orderId];
    }

    function getActiveListingsByProvider(address provider) external view returns (uint256[] memory) {
        return _activeListingsByProvider[provider];
    }

    function _removeActiveListing(address provider, uint256 listingId) internal {
        uint256[] storage list = _activeListingsByProvider[provider];
        uint256 len = list.length;
        for (uint256 i = 0; i < len;) {
            if (list[i] == listingId) {
                list[i] = list[len - 1];
                list.pop();
                return;
            }
            unchecked {
                ++i;
            }
        }
    }
}
