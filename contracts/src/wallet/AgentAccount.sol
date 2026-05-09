// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IAccount, PackedUserOperation} from "../interfaces/IAccount.sol";
import {IPolicyHook} from "../interfaces/IPolicyHook.sol";

/// @title AgentAccount
/// @notice Layer 2 (Wallet). Minimal modular smart account that supports BOTH:
///           a) Direct EOA owner execution (used in MVP demo on local anvil)
///           b) ERC-4337 v0.7 UserOperation flow via canonical EntryPoint
///         Modules follow ERC-7579 module-type IDs:
///           1 = validator (unused in MVP — single owner signature)
///           2 = executor  (unused in MVP)
///           3 = fallback  (unused in MVP)
///           4 = hook      (called before every execute, may revert to block)
/// @dev    Designed to be deployed behind an EIP-1167 minimal proxy via
///         AgentAccountFactory. State is in the proxy.
contract AgentAccount is IAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 public constant MODULE_TYPE_VALIDATOR = 1;
    uint256 public constant MODULE_TYPE_EXECUTOR = 2;
    uint256 public constant MODULE_TYPE_FALLBACK = 3;
    uint256 public constant MODULE_TYPE_HOOK = 4;

    /// @dev ERC-4337 v0.7 canonical EntryPoint address (same on every chain).
    address public constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    address public owner;
    address public recoveryModule;
    bool private _initialized;

    // moduleType => module => installed
    mapping(uint256 => mapping(address => bool)) public installedModules;
    // ordered list of installed hook modules (small N — bounded by MAX_HOOKS)
    address[] public hookModules;

    uint256 public constant MAX_HOOKS = 8;

    event Executed(address indexed target, uint256 value, bytes data);
    event ModuleInstalled(uint256 indexed moduleType, address indexed module);
    event ModuleUninstalled(uint256 indexed moduleType, address indexed module);
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event RecoveryModuleSet(address indexed module);

    error AlreadyInitialized();
    error NotAuthorized();
    error ModuleAlreadyInstalled();
    error ModuleNotInstalled();
    error UnsupportedModuleType();
    error TooManyHooks();
    error ExecutionFailed(bytes reason);
    error NotRecoveryModule();

    /// @notice Initializer for proxy pattern. Called once by the factory after CREATE2.
    function initialize(address _owner) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;
        owner = _owner;
        emit OwnerChanged(address(0), _owner);
    }

    modifier onlyOwnerOrEntryPoint() {
        if (msg.sender != owner && msg.sender != ENTRY_POINT) revert NotAuthorized();
        _;
    }

    modifier onlySelfOrOwner() {
        if (msg.sender != owner && msg.sender != address(this)) revert NotAuthorized();
        _;
    }

    receive() external payable {}

    // ─────────────────────────────────────────────────────────────────────
    // Execution
    // ─────────────────────────────────────────────────────────────────────

    function execute(address target, uint256 value, bytes calldata data) external onlyOwnerOrEntryPoint {
        _runHooks(target, value, data);
        _call(target, value, data);
        emit Executed(target, value, data);
    }

    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas)
        external
        onlyOwnerOrEntryPoint
    {
        require(targets.length == values.length && values.length == datas.length, "len");
        for (uint256 i = 0; i < targets.length;) {
            _runHooks(targets[i], values[i], datas[i]);
            _call(targets[i], values[i], datas[i]);
            emit Executed(targets[i], values[i], datas[i]);
            unchecked {
                ++i;
            }
        }
    }

    function _call(address target, uint256 value, bytes calldata data) internal {
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        if (!ok) revert ExecutionFailed(ret);
    }

    function _runHooks(address target, uint256 value, bytes calldata data) internal {
        uint256 len = hookModules.length;
        for (uint256 i = 0; i < len;) {
            IPolicyHook(hookModules[i]).checkAndUpdate(address(this), target, value, data);
            unchecked {
                ++i;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // ERC-7579 minimal module management
    // ─────────────────────────────────────────────────────────────────────

    function installModule(uint256 moduleType, address module, bytes calldata /* initData */ )
        external
        onlySelfOrOwner
    {
        if (installedModules[moduleType][module]) revert ModuleAlreadyInstalled();
        if (moduleType == 0 || moduleType > 4) revert UnsupportedModuleType();

        installedModules[moduleType][module] = true;
        if (moduleType == MODULE_TYPE_HOOK) {
            if (hookModules.length >= MAX_HOOKS) revert TooManyHooks();
            hookModules.push(module);
        }
        emit ModuleInstalled(moduleType, module);
    }

    function uninstallModule(uint256 moduleType, address module, bytes calldata /* deinitData */ )
        external
        onlySelfOrOwner
    {
        if (!installedModules[moduleType][module]) revert ModuleNotInstalled();
        installedModules[moduleType][module] = false;
        if (moduleType == MODULE_TYPE_HOOK) {
            _removeHook(module);
        }
        emit ModuleUninstalled(moduleType, module);
    }

    function isModuleInstalled(uint256 moduleType, address module, bytes calldata /* additionalContext */ )
        external
        view
        returns (bool)
    {
        return installedModules[moduleType][module];
    }

    function getHookModules() external view returns (address[] memory) {
        return hookModules;
    }

    function _removeHook(address module) internal {
        uint256 len = hookModules.length;
        for (uint256 i = 0; i < len;) {
            if (hookModules[i] == module) {
                hookModules[i] = hookModules[len - 1];
                hookModules.pop();
                return;
            }
            unchecked {
                ++i;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // ERC-4337 v0.7 surface
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Stub validator: signature is owner-ECDSA over the userOpHash.
    /// @dev    SIG_VALIDATION_FAILED = 1, SIG_VALIDATION_SUCCESS = 0.
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        returns (uint256 validationData)
    {
        if (msg.sender != ENTRY_POINT) revert NotAuthorized();

        bytes32 ethHash = userOpHash.toEthSignedMessageHash();
        address recovered = ECDSA.recover(ethHash, userOp.signature);
        validationData = recovered == owner ? 0 : 1;

        if (missingAccountFunds > 0) {
            (bool ok,) = ENTRY_POINT.call{value: missingAccountFunds}("");
            (ok); // entry point handles refund accounting
        }
    }

    function getNonce() external pure returns (uint256) {
        return 0; // EntryPoint v0.7 manages nonce externally; this is a stub for local dev
    }

    // ─────────────────────────────────────────────────────────────────────
    // Recovery integration
    // ─────────────────────────────────────────────────────────────────────

    function setRecoveryModule(address module) external onlySelfOrOwner {
        recoveryModule = module;
        emit RecoveryModuleSet(module);
    }

    /// @notice Owner rotation triggered by an authorized RecoveryModule after the
    ///         48-hour timelock elapses and threshold support is reached.
    function rotateOwnerByRecovery(address newOwner) external {
        if (msg.sender != recoveryModule) revert NotRecoveryModule();
        address prev = owner;
        owner = newOwner;
        emit OwnerChanged(prev, newOwner);
    }
}
