// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/identity/AgentRegistry.sol";
import {AgentAccount} from "../src/wallet/AgentAccount.sol";
import {AgentAccountFactory} from "../src/wallet/AgentAccountFactory.sol";
import {SpendingPolicyModule} from "../src/wallet/modules/SpendingPolicyModule.sol";
import {RecoveryModule} from "../src/wallet/modules/RecoveryModule.sol";
import {ServiceMarketplace} from "../src/marketplace/ServiceMarketplace.sol";
import {ReputationRegistry} from "../src/reputation/ReputationRegistry.sol";

/// @notice Deploys the full AgentMesh stack and writes addresses to
///         deployments/<chain>.json. Reads the deployer key from $PRIVATE_KEY_DEPLOYER.
contract Deploy is Script {
    struct Deployment {
        address registry;
        address reputation;
        address marketplace;
        address accountImpl;
        address accountFactory;
        address spendingPolicy;
        address recoveryModule;
        uint256 chainId;
        uint256 blockNumber;
        address deployer;
    }

    function run() external returns (Deployment memory d) {
        uint256 pk = vm.envUint("PRIVATE_KEY_DEPLOYER");
        address deployer = vm.addr(pk);
        console.log("Deployer:", deployer);
        console.log("Chain:", block.chainid);

        vm.startBroadcast(pk);

        ReputationRegistry reputation = new ReputationRegistry(deployer);
        AgentRegistry registry = new AgentRegistry();
        AgentAccount accountImpl = new AgentAccount();
        AgentAccountFactory factory = new AgentAccountFactory(address(accountImpl));
        SpendingPolicyModule policy = new SpendingPolicyModule();
        RecoveryModule recovery = new RecoveryModule();
        ServiceMarketplace market = new ServiceMarketplace(address(reputation));

        // Authorize the marketplace as a reputation logger
        reputation.authorizeLogger(address(market), true);

        vm.stopBroadcast();

        d = Deployment({
            registry: address(registry),
            reputation: address(reputation),
            marketplace: address(market),
            accountImpl: address(accountImpl),
            accountFactory: address(factory),
            spendingPolicy: address(policy),
            recoveryModule: address(recovery),
            chainId: block.chainid,
            blockNumber: block.number,
            deployer: deployer
        });

        _persist(d);
        _summary(d);
    }

    function _persist(Deployment memory d) internal {
        string memory chainName = _chainName(d.chainId);
        string memory path = string.concat("../deployments/", chainName, ".json");

        string memory json = "deployment";
        vm.serializeUint(json, "chainId", d.chainId);
        vm.serializeUint(json, "blockNumber", d.blockNumber);
        vm.serializeAddress(json, "deployer", d.deployer);
        vm.serializeAddress(json, "registry", d.registry);
        vm.serializeAddress(json, "reputation", d.reputation);
        vm.serializeAddress(json, "marketplace", d.marketplace);
        vm.serializeAddress(json, "accountImpl", d.accountImpl);
        vm.serializeAddress(json, "accountFactory", d.accountFactory);
        vm.serializeAddress(json, "spendingPolicy", d.spendingPolicy);
        string memory finalJson = vm.serializeAddress(json, "recoveryModule", d.recoveryModule);

        vm.writeFile(path, finalJson);
        console.log("Wrote deployment to", path);
    }

    function _summary(Deployment memory d) internal pure {
        console.log("=== AgentMesh deployment ===");
        console.log("AgentRegistry        :", d.registry);
        console.log("ReputationRegistry   :", d.reputation);
        console.log("ServiceMarketplace   :", d.marketplace);
        console.log("AgentAccount(impl)   :", d.accountImpl);
        console.log("AgentAccountFactory  :", d.accountFactory);
        console.log("SpendingPolicyModule :", d.spendingPolicy);
        console.log("RecoveryModule       :", d.recoveryModule);
    }

    function _chainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 31337) return "anvil";
        if (chainId == 80002) return "amoy";
        if (chainId == 84532) return "base-sepolia";
        if (chainId == 1) return "mainnet";
        return string.concat("chain-", _toString(chainId));
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 temp = v;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory b = new bytes(digits);
        while (v != 0) {
            digits -= 1;
            b[digits] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(b);
    }
}
