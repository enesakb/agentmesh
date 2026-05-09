// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IReputationRegistry} from "../interfaces/IReputationRegistry.sol";

/// @title ReputationRegistry
/// @notice Layer 6 (Reputation). Append-only on-chain log of agent transaction
///         outcomes. Only authorized loggers (e.g. ServiceMarketplace) may write.
/// @dev    Score formula:
///           successRate = successCount * 10_000 / max(1, totalTxCount)        (0..10_000)
///           confidence  = sqrt(min(totalTxCount, 100))                         (1..10)
///           score       = clamp((successRate * confidence) / 10, 0, 10_000)
///         New agent with 1 success → 1000 (10% of ceiling).
///         100+ successful txs with no failures → 10_000 ceiling.
///         100 txs with 90% success → 9_000.
contract ReputationRegistry is IReputationRegistry, Ownable {
    mapping(address => Stats) private _stats;
    mapping(address => mapping(address => bool)) private _hasInteracted;
    mapping(address => bool) private _authorized;

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyAuthorizedLogger() {
        if (!_authorized[msg.sender]) revert NotAuthorizedLogger();
        _;
    }

    function authorizeLogger(address logger, bool authorized) external onlyOwner {
        if (logger == address(0)) revert ZeroAddress();
        _authorized[logger] = authorized;
        emit LoggerAuthorized(logger, authorized);
    }

    function logSuccess(address agent, address counterparty, uint256 valueWei) external onlyAuthorizedLogger {
        _log(agent, counterparty, valueWei, true);
    }

    function logFailure(address agent, address counterparty, uint256 valueWei) external onlyAuthorizedLogger {
        _log(agent, counterparty, valueWei, false);
    }

    function _log(address agent, address counterparty, uint256 valueWei, bool success) internal {
        if (agent == address(0) || counterparty == address(0)) revert ZeroAddress();

        Stats storage s = _stats[agent];

        if (s.firstSeenTimestamp == 0) {
            s.firstSeenTimestamp = uint64(block.timestamp);
        }
        s.lastSeenTimestamp = uint64(block.timestamp);
        s.totalTxCount += 1;
        if (success) {
            s.successCount += 1;
        } else {
            s.failureCount += 1;
        }
        s.totalVolumeWei += valueWei;

        if (!_hasInteracted[agent][counterparty]) {
            _hasInteracted[agent][counterparty] = true;
            s.uniqueCounterpartiesCount += 1;
        }

        emit ReputationLogged(agent, counterparty, success, valueWei, s.totalTxCount);
    }

    function getReputation(address agent) external view returns (Stats memory) {
        return _stats[agent];
    }

    function getReputationScore(address agent) external view returns (uint256) {
        Stats memory s = _stats[agent];
        if (s.totalTxCount == 0) return 0;

        uint256 successRate = (uint256(s.successCount) * 10_000) / uint256(s.totalTxCount);
        uint256 capped = s.totalTxCount > 100 ? 100 : s.totalTxCount;
        uint256 confidence = _sqrt(capped); // 1..10

        uint256 score = (successRate * confidence) / 10;
        return score > 10_000 ? 10_000 : score;
    }

    function isAuthorizedLogger(address logger) external view returns (bool) {
        return _authorized[logger];
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
