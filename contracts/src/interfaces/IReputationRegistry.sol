// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReputationRegistry {
    struct Stats {
        uint128 totalTxCount;
        uint128 successCount;
        uint128 failureCount;
        uint256 totalVolumeWei;
        uint64 firstSeenTimestamp;
        uint64 lastSeenTimestamp;
        uint128 uniqueCounterpartiesCount;
    }

    event ReputationLogged(
        address indexed agent, address indexed counterparty, bool success, uint256 valueWei, uint128 newTotalTxCount
    );
    event LoggerAuthorized(address indexed logger, bool authorized);

    error NotAuthorizedLogger();
    error ZeroAddress();

    function logSuccess(address agent, address counterparty, uint256 valueWei) external;
    function logFailure(address agent, address counterparty, uint256 valueWei) external;
    function authorizeLogger(address logger, bool authorized) external;

    function getReputation(address agent) external view returns (Stats memory);
    function getReputationScore(address agent) external view returns (uint256);
    function isAuthorizedLogger(address logger) external view returns (bool);
}
