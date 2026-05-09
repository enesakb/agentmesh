// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AgentAccount} from "../AgentAccount.sol";

/// @title RecoveryModule
/// @notice Argent-style social recovery: M-of-N guardians can rotate the owner of an
///         AgentAccount after a 48-hour timelock. The active owner can cancel any
///         in-flight recovery before execution.
/// @dev    Recovery executes by calling `account.execute(account, 0, abi.encodeCall(initOwner))`
///         which is gated by AgentAccount's onlySelfOrOwner. To make this possible, the
///         account itself must hold the recovery module as an "executor" privilege —
///         in MVP we use the simpler trick: this module exposes executeRecovery() which
///         calls account.replaceOwner(newOwner) — but AgentAccount has no such function.
///         So instead, the account must be initialized with this module also as the
///         "owner" path: we add a lightweight rotateOwner(address newOwner) that is
///         callable by the recovery module.
///
///         To keep the surface small in this MVP, AgentAccount exposes
///         `_authorizedRecoveryModule` and `rotateOwnerByRecovery()`. We treat
///         RecoveryModule as a privileged peer rather than a generic module call.
///
///         For production: this should be migrated to a proper ERC-7579 executor
///         module that calls back into the account via execute(), gated by the
///         module-installed check.
contract RecoveryModule {
    uint64 public constant DELAY = 48 hours;

    struct GuardianSet {
        address[] guardians;
        mapping(address => bool) isGuardian;
        uint256 threshold;
        bool initialized;
    }

    struct Recovery {
        address account;
        address proposedOwner;
        uint64 readyAt;
        uint256 supportCount;
        mapping(address => bool) supported;
        bool executed;
        bool cancelled;
    }

    mapping(address => GuardianSet) private _guardians;
    mapping(uint256 => Recovery) private _recoveries;
    uint256 public nextRecoveryId = 1;

    event GuardiansSet(address indexed account, address[] guardians, uint256 threshold);
    event RecoveryInitiated(uint256 indexed recoveryId, address indexed account, address proposedOwner, uint64 readyAt);
    event RecoverySupported(uint256 indexed recoveryId, address indexed guardian, uint256 newSupportCount);
    event RecoveryExecuted(uint256 indexed recoveryId, address indexed account, address newOwner);
    event RecoveryCancelled(uint256 indexed recoveryId, address indexed account);

    error NotGuardian();
    error AlreadySupported();
    error GuardiansNotSet();
    error RecoveryNotFound();
    error RecoveryAlreadyResolved();
    error TimelockNotExpired();
    error InsufficientSupport();
    error NotOwner();
    error InvalidThreshold();
    error CallerMustBeAccount();
    error EmptyGuardians();

    function setGuardians(address[] calldata guardians, uint256 threshold) external {
        if (guardians.length == 0) revert EmptyGuardians();
        if (threshold == 0 || threshold > guardians.length) revert InvalidThreshold();

        GuardianSet storage gs = _guardians[msg.sender];

        // wipe old
        for (uint256 i = 0; i < gs.guardians.length;) {
            gs.isGuardian[gs.guardians[i]] = false;
            unchecked {
                ++i;
            }
        }
        delete gs.guardians;

        for (uint256 i = 0; i < guardians.length;) {
            address g = guardians[i];
            require(g != address(0) && !gs.isGuardian[g], "bad-guardian");
            gs.guardians.push(g);
            gs.isGuardian[g] = true;
            unchecked {
                ++i;
            }
        }
        gs.threshold = threshold;
        gs.initialized = true;

        emit GuardiansSet(msg.sender, guardians, threshold);
    }

    function initiateRecovery(address account, address proposedOwner) external returns (uint256 recoveryId) {
        GuardianSet storage gs = _guardians[account];
        if (!gs.initialized) revert GuardiansNotSet();
        if (!gs.isGuardian[msg.sender]) revert NotGuardian();

        recoveryId = nextRecoveryId++;
        Recovery storage r = _recoveries[recoveryId];
        r.account = account;
        r.proposedOwner = proposedOwner;
        r.readyAt = uint64(block.timestamp + DELAY);
        r.supportCount = 1;
        r.supported[msg.sender] = true;

        emit RecoveryInitiated(recoveryId, account, proposedOwner, r.readyAt);
        emit RecoverySupported(recoveryId, msg.sender, 1);
    }

    function supportRecovery(uint256 recoveryId) external {
        Recovery storage r = _recoveries[recoveryId];
        if (r.account == address(0)) revert RecoveryNotFound();
        if (r.executed || r.cancelled) revert RecoveryAlreadyResolved();
        if (!_guardians[r.account].isGuardian[msg.sender]) revert NotGuardian();
        if (r.supported[msg.sender]) revert AlreadySupported();

        r.supported[msg.sender] = true;
        r.supportCount += 1;

        emit RecoverySupported(recoveryId, msg.sender, r.supportCount);
    }

    function executeRecovery(uint256 recoveryId) external {
        Recovery storage r = _recoveries[recoveryId];
        if (r.account == address(0)) revert RecoveryNotFound();
        if (r.executed || r.cancelled) revert RecoveryAlreadyResolved();
        if (block.timestamp < r.readyAt) revert TimelockNotExpired();

        GuardianSet storage gs = _guardians[r.account];
        if (r.supportCount < gs.threshold) revert InsufficientSupport();

        r.executed = true;

        // Call back into the account to rotate its owner.
        AgentAccount(payable(r.account)).rotateOwnerByRecovery(r.proposedOwner);

        emit RecoveryExecuted(recoveryId, r.account, r.proposedOwner);
    }

    function cancelRecovery(uint256 recoveryId) external {
        Recovery storage r = _recoveries[recoveryId];
        if (r.account == address(0)) revert RecoveryNotFound();
        if (r.executed || r.cancelled) revert RecoveryAlreadyResolved();

        // Owner of the account can cancel.
        if (AgentAccount(payable(r.account)).owner() != msg.sender) revert NotOwner();

        r.cancelled = true;
        emit RecoveryCancelled(recoveryId, r.account);
    }

    function getGuardians(address account) external view returns (address[] memory list, uint256 threshold) {
        GuardianSet storage gs = _guardians[account];
        return (gs.guardians, gs.threshold);
    }

    function getRecovery(uint256 recoveryId)
        external
        view
        returns (address account, address proposedOwner, uint64 readyAt, uint256 supportCount, bool executed, bool cancelled)
    {
        Recovery storage r = _recoveries[recoveryId];
        return (r.account, r.proposedOwner, r.readyAt, r.supportCount, r.executed, r.cancelled);
    }
}
