// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPolicyHook} from "../../interfaces/IPolicyHook.sol";

/// @title SpendingPolicyModule
/// @notice Hook (ERC-7579 module type 4) enforced before every AgentAccount execute.
///         Per-account daily-limit + per-tx-limit + target blacklist.
///         Owner-controlled policy: only the account itself (typically via
///         account.execute(policyModule, 0, encodedSetPolicy)) can mutate state.
contract SpendingPolicyModule is IPolicyHook {
    struct Policy {
        uint256 dailyLimitWei;
        uint256 perTxLimitWei;
        uint64 windowStart;
        uint256 spentInWindow;
        bool initialized;
    }

    /// @notice 24-hour rolling window for the daily limit.
    uint64 public constant WINDOW = 1 days;

    mapping(address => Policy) private _policies;
    mapping(address => mapping(address => bool)) public blacklisted;

    event PolicySet(address indexed account, uint256 dailyLimitWei, uint256 perTxLimitWei);
    event Blacklisted(address indexed account, address indexed target, bool flag);
    event Spent(address indexed account, address indexed target, uint256 value, uint256 newWindowTotal);

    error PolicyNotSet();
    error PerTxLimitExceeded(uint256 value, uint256 limit);
    error DailyLimitExceeded(uint256 wouldSpend, uint256 limit);
    error TargetBlacklisted(address target);
    error CallerMustBeAccount();

    function setPolicy(uint256 dailyLimitWei, uint256 perTxLimitWei) external {
        Policy storage p = _policies[msg.sender];
        p.dailyLimitWei = dailyLimitWei;
        p.perTxLimitWei = perTxLimitWei;
        if (!p.initialized) {
            p.windowStart = uint64(block.timestamp);
            p.initialized = true;
        }
        emit PolicySet(msg.sender, dailyLimitWei, perTxLimitWei);
    }

    function setBlacklist(address target, bool flag) external {
        blacklisted[msg.sender][target] = flag;
        emit Blacklisted(msg.sender, target, flag);
    }

    /// @inheritdoc IPolicyHook
    /// @dev Only callable from the account itself (the hook is wired into AgentAccount.execute).
    function checkAndUpdate(address account, address target, uint256 value, bytes calldata /* data */ ) external {
        if (msg.sender != account) revert CallerMustBeAccount();

        Policy storage p = _policies[account];
        if (!p.initialized) revert PolicyNotSet();

        if (blacklisted[account][target]) revert TargetBlacklisted(target);

        if (p.perTxLimitWei != 0 && value > p.perTxLimitWei) {
            revert PerTxLimitExceeded(value, p.perTxLimitWei);
        }

        // Roll window if expired
        if (block.timestamp >= uint256(p.windowStart) + WINDOW) {
            p.windowStart = uint64(block.timestamp);
            p.spentInWindow = 0;
        }

        if (p.dailyLimitWei != 0) {
            uint256 wouldSpend = p.spentInWindow + value;
            if (wouldSpend > p.dailyLimitWei) {
                revert DailyLimitExceeded(wouldSpend, p.dailyLimitWei);
            }
            p.spentInWindow = wouldSpend;
        } else {
            p.spentInWindow += value;
        }

        emit Spent(account, target, value, p.spentInWindow);
    }

    function getPolicy(address account) external view returns (Policy memory) {
        return _policies[account];
    }
}
