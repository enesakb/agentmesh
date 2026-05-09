// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {AgentAccount} from "./AgentAccount.sol";

/// @title AgentAccountFactory
/// @notice Deterministic deployer for AgentAccount EIP-1167 minimal proxies.
///         Address is determined by (implementation, owner, salt).
contract AgentAccountFactory {
    address public immutable implementation;

    event AccountCreated(address indexed account, address indexed owner, uint256 salt);

    constructor(address _implementation) {
        require(_implementation != address(0), "impl=0");
        implementation = _implementation;
    }

    function createAccount(address ownerAddr, uint256 salt) external returns (address account) {
        bytes32 saltHash = _saltHash(ownerAddr, salt);
        address predicted = Clones.predictDeterministicAddress(implementation, saltHash, address(this));

        // If already deployed, return existing.
        if (predicted.code.length > 0) {
            return predicted;
        }

        account = Clones.cloneDeterministic(implementation, saltHash);
        AgentAccount(payable(account)).initialize(ownerAddr);
        emit AccountCreated(account, ownerAddr, salt);
    }

    function getAddress(address ownerAddr, uint256 salt) external view returns (address) {
        bytes32 saltHash = _saltHash(ownerAddr, salt);
        return Clones.predictDeterministicAddress(implementation, saltHash, address(this));
    }

    function _saltHash(address ownerAddr, uint256 salt) internal pure returns (bytes32) {
        return keccak256(abi.encode(ownerAddr, salt));
    }
}
