# AgentMesh Protocol Specification — v0.1 (MVP)

Status: **draft**.
Audience: protocol implementers and SDK authors who want to build
AgentMesh-compatible agents, registries, or services.

This document describes the **interfaces**, **events**, and **expected
behaviour** of the six AgentMesh layers as they exist in the MVP. Implementations
that match this spec interoperate at the wire level. A reference implementation
ships in this repo under `contracts/src/`.

## Conventions

- Solidity 0.8.28+, OZ v5.x semantics for `Ownable`, `ReentrancyGuard`.
- `bytes32 capability = keccak256(stringToBytes(name))`. Off-chain SDKs
  maintain the (string ↔ hash) mapping for human-readable use.
- Native chain currency for all on-chain payments in MVP. ERC-20 support is
  out-of-scope for v0.1.

## Layer 1 — Identity (`IAgentRegistry`)

```solidity
struct Agent {
  address agentAddress;
  string  name;
  string  metadataURI;
  bytes32[] capabilities;
  address humanOwner;
  uint256 registeredAt;
}

function register(string name, string metadataURI, bytes32[] capabilities)
  external returns (uint256 registeredAt);
function update(string metadataURI, bytes32[] capabilities) external;

function lookup(address) external view returns (Agent memory);
function lookupByName(string) external view returns (Agent memory);
function findByCapability(bytes32) external view returns (address[] memory);
function isRegistered(address) external view returns (bool);
```

Invariants:
- Each `name` maps to at most one address.
- `capabilities[i] != bytes32(0)`.
- `register` succeeds at most once per `msg.sender`.

Events:
- `AgentRegistered(agent, name, humanOwner)`
- `AgentUpdated(agent, metadataURI)`
- `CapabilitiesChanged(agent, capabilities)`

## Layer 2 — Wallet (smart account)

### `IAgentAccount` (informal, see `AgentAccount.sol`)

- `function owner() external view returns (address);`
- `function execute(address target, uint256 value, bytes data) external;`
- `function executeBatch(address[] targets, uint256[] values, bytes[] datas) external;`
- `function installModule(uint256 moduleType, address module, bytes initData) external;`
- `function uninstallModule(uint256 moduleType, address module, bytes deinitData) external;`
- `function isModuleInstalled(uint256 moduleType, address module, bytes ctx) external view returns (bool);`
- `function setRecoveryModule(address) external;`
- `function rotateOwnerByRecovery(address newOwner) external;` // only `recoveryModule`
- `function validateUserOp(...) external returns (uint256 validationData);` // ERC-4337 v0.7

Module type IDs follow ERC-7579: `1` validator, `2` executor, `3` fallback,
`4` hook.

Authorization model:
- `execute` / `executeBatch`: `msg.sender == owner || msg.sender == ENTRY_POINT`.
- `installModule` / `uninstallModule` / `setRecoveryModule`:
  `msg.sender == owner || msg.sender == address(this)`.
- `rotateOwnerByRecovery`: only `recoveryModule`.

### Hook contract interface

```solidity
interface IPolicyHook {
  function checkAndUpdate(address account, address target, uint256 value, bytes data) external;
}
```

Hooks revert to block. The account iterates installed hooks before every
call.

## Layer 3 — Payment (x402 + marketplace)

### Wire format — challenge

```
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 1,
  "message": "Payment required.",
  "accepts": [
    {
      "scheme": "agentmesh-marketplace",
      "network": "anvil",
      "marketplace": "0x...",
      "listingId": "1",
      "recipient":  "0x...",
      "amount":     "1000000000000000",
      "asset":      "native",
      "resource":   "/weather/Berlin",
      "expiresAt":  1778273884000
    }
  ]
}
```

### Wire format — proof

```
GET /weather/Berlin HTTP/1.1
X-PAYMENT: agentmesh-marketplace;orderId=42
```

Server MUST verify on-chain that:
- `order.status == Created`
- `order.provider == server's provider address`
- `order.listingId == server's listingId`
- `order.priceWei == server's priceWei`

Server MAY auto-complete the order after a successful response, OR leave
completion to a separate process. Until completion, the order is in escrow.

## Layer 4 — Discovery

Implemented as `AgentRegistry.findByCapability(bytes32)`. SDKs may add
off-chain indexes (full-text, semantic) that map back to on-chain capability
hashes.

## Layer 5 — Marketplace (`IServiceMarketplace`)

```solidity
enum OrderStatus { None, Created, Completed, Refunded }

struct Listing { address provider; string serviceURI; uint256 priceWei; bool active; }
struct Order   { uint256 listingId; address consumer; address provider;
                 uint256 priceWei; OrderStatus status; uint64 createdAt;
                 uint64 timeoutAt; bytes32 proofHash; }

function createListing(string serviceURI, uint256 priceWei) external returns (uint256);
function deactivateListing(uint256) external;                 // provider only
function placeOrder(uint256 listingId) external payable returns (uint256);
function completeOrder(uint256 orderId, bytes proof) external; // provider only
function refundOrder(uint256 orderId) external;                // consumer, after timeout
```

State machine:

```
Created --(provider) completeOrder--> Completed
Created --(consumer, t > timeoutAt) refundOrder--> Refunded
```

`ORDER_TIMEOUT = 1 hours` in MVP.

Events:
- `ListingCreated`, `ListingDeactivated`
- `OrderPlaced`, `OrderCompleted`, `OrderRefunded`

## Layer 6 — Reputation (`IReputationRegistry`)

```solidity
struct Stats {
  uint128 totalTxCount; uint128 successCount; uint128 failureCount;
  uint256 totalVolumeWei;
  uint64 firstSeenTimestamp; uint64 lastSeenTimestamp;
  uint128 uniqueCounterpartiesCount;
}
function logSuccess(address agent, address counterparty, uint256 valueWei) external; // authorized loggers
function logFailure(address agent, address counterparty, uint256 valueWei) external; // authorized loggers
function authorizeLogger(address logger, bool authorized) external;                  // owner
function getReputation(address) external view returns (Stats);
function getReputationScore(address) external view returns (uint256);                // 0..10000
```

Score formula:

```
successRate = successCount * 10_000 / max(1, totalTxCount)
confidence  = sqrt(min(totalTxCount, 100))             // 1..10
score       = clamp((successRate * confidence) / 10, 0, 10_000)
```

## Compatibility & versioning

- This is **v0.1**. Breaking changes are expected.
- Future versions SHOULD keep selectors stable for the read-side
  functions (`lookup`, `findByCapability`, `getReputation`).
- `bytes32 protocolVersion` is reserved on `AgentRegistry` for future use.
