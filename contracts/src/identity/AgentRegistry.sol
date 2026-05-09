// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAgentRegistry} from "../interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice Layer 1 (Identity) + Layer 4 (Discovery) of the AgentMesh stack.
///         An agent is identified by the address of its smart account; the registry
///         maps that address to a unique human-readable name, off-chain metadata, and
///         a list of capability hashes used for capability-based discovery.
/// @dev    Only the agent address itself (msg.sender) can register or update its own
///         entry. Capability resolution is on-chain by hash — string mapping happens
///         off-chain through the SDK.
contract AgentRegistry is IAgentRegistry {
    mapping(address => Agent) private _agents;
    mapping(string => address) private _nameToAddress;
    mapping(bytes32 => address[]) private _capabilityToAgents;
    mapping(bytes32 => mapping(address => bool)) private _hasCapability;

    uint256 public totalAgents;

    function register(string calldata name, string calldata metadataURI, bytes32[] calldata capabilities)
        external
        returns (uint256 registeredAt)
    {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(name).length > 64) revert NameTooLong();
        if (_agents[msg.sender].registeredAt != 0) revert AgentAlreadyRegistered();
        if (_nameToAddress[name] != address(0)) revert NameAlreadyTaken();

        registeredAt = block.timestamp;

        Agent storage a = _agents[msg.sender];
        a.agentAddress = msg.sender;
        a.name = name;
        a.metadataURI = metadataURI;
        a.humanOwner = tx.origin == msg.sender ? address(0) : tx.origin;
        a.registeredAt = registeredAt;

        _nameToAddress[name] = msg.sender;
        _setCapabilities(msg.sender, capabilities);

        unchecked {
            ++totalAgents;
        }

        emit AgentRegistered(msg.sender, name, a.humanOwner);
    }

    function update(string calldata metadataURI, bytes32[] calldata capabilities) external {
        Agent storage a = _agents[msg.sender];
        if (a.registeredAt == 0) revert AgentNotRegistered();

        a.metadataURI = metadataURI;
        _setCapabilities(msg.sender, capabilities);

        emit AgentUpdated(msg.sender, metadataURI);
    }

    function lookup(address agent) external view returns (Agent memory) {
        if (_agents[agent].registeredAt == 0) revert AgentNotRegistered();
        return _agents[agent];
    }

    function lookupByName(string calldata name) external view returns (Agent memory) {
        address addr = _nameToAddress[name];
        if (addr == address(0)) revert AgentNotRegistered();
        return _agents[addr];
    }

    function findByCapability(bytes32 capability) external view returns (address[] memory) {
        return _capabilityToAgents[capability];
    }

    function isRegistered(address agent) external view returns (bool) {
        return _agents[agent].registeredAt != 0;
    }

    function _setCapabilities(address agent, bytes32[] calldata capabilities) internal {
        bytes32[] storage existing = _agents[agent].capabilities;

        for (uint256 i = 0; i < existing.length;) {
            bytes32 cap = existing[i];
            if (_hasCapability[cap][agent]) {
                _hasCapability[cap][agent] = false;
                _removeFromCapabilityList(cap, agent);
            }
            unchecked {
                ++i;
            }
        }
        delete _agents[agent].capabilities;

        for (uint256 i = 0; i < capabilities.length;) {
            bytes32 cap = capabilities[i];
            if (cap == bytes32(0)) revert InvalidCapability();

            if (!_hasCapability[cap][agent]) {
                _hasCapability[cap][agent] = true;
                _capabilityToAgents[cap].push(agent);
                _agents[agent].capabilities.push(cap);
            }
            unchecked {
                ++i;
            }
        }

        emit CapabilitiesChanged(agent, capabilities);
    }

    function _removeFromCapabilityList(bytes32 capability, address agent) internal {
        address[] storage list = _capabilityToAgents[capability];
        uint256 len = list.length;
        for (uint256 i = 0; i < len;) {
            if (list[i] == agent) {
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
