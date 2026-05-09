// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IServiceMarketplace {
    enum OrderStatus {
        None,
        Created,
        Completed,
        Refunded
    }

    struct Listing {
        address provider;
        string serviceURI;
        uint256 priceWei;
        bool active;
    }

    struct Order {
        uint256 listingId;
        address consumer;
        address provider;
        uint256 priceWei;
        OrderStatus status;
        uint64 createdAt;
        uint64 timeoutAt;
        bytes32 proofHash;
    }

    event ListingCreated(uint256 indexed listingId, address indexed provider, uint256 priceWei, string serviceURI);
    event ListingDeactivated(uint256 indexed listingId, address indexed provider);
    event OrderPlaced(
        uint256 indexed orderId, uint256 indexed listingId, address indexed consumer, address provider, uint256 priceWei
    );
    event OrderCompleted(
        uint256 indexed orderId, address indexed provider, address indexed consumer, uint256 priceWei, bytes32 proofHash
    );
    event OrderRefunded(uint256 indexed orderId, address indexed provider, address indexed consumer, uint256 priceWei);

    error EmptyServiceURI();
    error ZeroPrice();
    error ListingNotActive();
    error ListingNotFound();
    error NotProvider();
    error NotConsumer();
    error WrongPaymentAmount();
    error OrderNotActive();
    error TimeoutNotReached();
    error PaymentTransferFailed();

    function createListing(string calldata serviceURI, uint256 priceWei) external returns (uint256 listingId);
    function deactivateListing(uint256 listingId) external;
    function placeOrder(uint256 listingId) external payable returns (uint256 orderId);
    function completeOrder(uint256 orderId, bytes calldata proof) external;
    function refundOrder(uint256 orderId) external;

    function getListing(uint256 listingId) external view returns (Listing memory);
    function getOrder(uint256 orderId) external view returns (Order memory);
    function getActiveListingsByProvider(address provider) external view returns (uint256[] memory);
}
