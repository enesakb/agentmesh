import { parseAbi } from 'viem';

export const agentRegistryAbi = parseAbi([
  'struct Agent { address agentAddress; string name; string metadataURI; bytes32[] capabilities; address humanOwner; uint256 registeredAt; }',
  'function register(string name, string metadataURI, bytes32[] capabilities) returns (uint256)',
  'function update(string metadataURI, bytes32[] capabilities)',
  'function lookup(address agent) view returns (Agent)',
  'function lookupByName(string name) view returns (Agent)',
  'function findByCapability(bytes32 capability) view returns (address[])',
  'function isRegistered(address agent) view returns (bool)',
  'function totalAgents() view returns (uint256)',
  'event AgentRegistered(address indexed agent, string name, address indexed humanOwner)',
  'event CapabilitiesChanged(address indexed agent, bytes32[] capabilities)',
]);

export const agentAccountAbi = parseAbi([
  'function owner() view returns (address)',
  'function recoveryModule() view returns (address)',
  'function MODULE_TYPE_HOOK() view returns (uint256)',
  'function MODULE_TYPE_VALIDATOR() view returns (uint256)',
  'function execute(address target, uint256 value, bytes data)',
  'function executeBatch(address[] targets, uint256[] values, bytes[] datas)',
  'function installModule(uint256 moduleType, address module, bytes initData)',
  'function uninstallModule(uint256 moduleType, address module, bytes deinitData)',
  'function isModuleInstalled(uint256 moduleType, address module, bytes additionalContext) view returns (bool)',
  'function setRecoveryModule(address module)',
  'function getHookModules() view returns (address[])',
  'event Executed(address indexed target, uint256 value, bytes data)',
  'event OwnerChanged(address indexed previousOwner, address indexed newOwner)',
]);

export const agentAccountFactoryAbi = parseAbi([
  'function createAccount(address owner, uint256 salt) returns (address)',
  'function getAddress(address owner, uint256 salt) view returns (address)',
  'function implementation() view returns (address)',
  'event AccountCreated(address indexed account, address indexed owner, uint256 salt)',
]);

export const spendingPolicyModuleAbi = parseAbi([
  'struct Policy { uint256 dailyLimitWei; uint256 perTxLimitWei; uint64 windowStart; uint256 spentInWindow; bool initialized; }',
  'function setPolicy(uint256 dailyLimitWei, uint256 perTxLimitWei)',
  'function setBlacklist(address target, bool flag)',
  'function checkAndUpdate(address account, address target, uint256 value, bytes data)',
  'function getPolicy(address account) view returns (Policy)',
]);

export const recoveryModuleAbi = parseAbi([
  'function setGuardians(address[] guardians, uint256 threshold)',
  'function initiateRecovery(address account, address proposedOwner) returns (uint256)',
  'function supportRecovery(uint256 recoveryId)',
  'function executeRecovery(uint256 recoveryId)',
  'function cancelRecovery(uint256 recoveryId)',
  'function getGuardians(address account) view returns (address[], uint256)',
]);

export const serviceMarketplaceAbi = parseAbi([
  'struct Listing { address provider; string serviceURI; uint256 priceWei; bool active; }',
  'struct Order { uint256 listingId; address consumer; address provider; uint256 priceWei; uint8 status; uint64 createdAt; uint64 timeoutAt; bytes32 proofHash; }',
  'function createListing(string serviceURI, uint256 priceWei) returns (uint256)',
  'function deactivateListing(uint256 listingId)',
  'function placeOrder(uint256 listingId) payable returns (uint256)',
  'function completeOrder(uint256 orderId, bytes proof)',
  'function refundOrder(uint256 orderId)',
  'function getListing(uint256 listingId) view returns (Listing)',
  'function getOrder(uint256 orderId) view returns (Order)',
  'function getActiveListingsByProvider(address provider) view returns (uint256[])',
  'function nextOrderId() view returns (uint256)',
  'function nextListingId() view returns (uint256)',
  'event ListingCreated(uint256 indexed listingId, address indexed provider, uint256 priceWei, string serviceURI)',
  'event OrderPlaced(uint256 indexed orderId, uint256 indexed listingId, address indexed consumer, address provider, uint256 priceWei)',
  'event OrderCompleted(uint256 indexed orderId, address indexed provider, address indexed consumer, uint256 priceWei, bytes32 proofHash)',
  'event OrderRefunded(uint256 indexed orderId, address indexed provider, address indexed consumer, uint256 priceWei)',
]);

export const reputationRegistryAbi = parseAbi([
  'struct Stats { uint128 totalTxCount; uint128 successCount; uint128 failureCount; uint256 totalVolumeWei; uint64 firstSeenTimestamp; uint64 lastSeenTimestamp; uint128 uniqueCounterpartiesCount; }',
  'function logSuccess(address agent, address counterparty, uint256 valueWei)',
  'function logFailure(address agent, address counterparty, uint256 valueWei)',
  'function authorizeLogger(address logger, bool authorized)',
  'function getReputation(address agent) view returns (Stats)',
  'function getReputationScore(address agent) view returns (uint256)',
  'function isAuthorizedLogger(address logger) view returns (bool)',
  'event ReputationLogged(address indexed agent, address indexed counterparty, bool success, uint256 valueWei, uint128 newTotalTxCount)',
]);
