// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAgentRegistry {
    struct Agent {
        address agentAddress;
        string name;
        string metadataURI;
        bytes32[] capabilities;
        address humanOwner;
        uint256 registeredAt;
    }

    event AgentRegistered(address indexed agent, string name, address indexed humanOwner);
    event AgentUpdated(address indexed agent, string metadataURI);
    event CapabilitiesChanged(address indexed agent, bytes32[] capabilities);

    error NameAlreadyTaken();
    error NameTooLong();
    error NameTooShort();
    error EmptyName();
    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error InvalidCapability();

    function register(string calldata name, string calldata metadataURI, bytes32[] calldata capabilities)
        external
        returns (uint256 registeredAt);

    function update(string calldata metadataURI, bytes32[] calldata capabilities) external;

    function lookup(address agent) external view returns (Agent memory);
    function lookupByName(string calldata name) external view returns (Agent memory);
    function findByCapability(bytes32 capability) external view returns (address[] memory);
    function isRegistered(address agent) external view returns (bool);
}
