#!/usr/bin/env bash
set -euo pipefail

# Fetch ABIs for Base bridge contracts. Falls back to embedded minimal ABIs if remote fetch fails.
# Usage: ./scripts/fetch-abis.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ABI_DIR="${ROOT}/abis"
mkdir -p "$ABI_DIR"

fetch_or_fallback() {
  local address_lower name url tmp
  address_lower=$(echo "$1" | tr 'A-Z' 'a-z')
  name="$2"
  url="https://sourcify.dev/server/repository/contracts/full_match/8453/${address_lower}/metadata.json"
  tmp="$(mktemp)"
  echo "Fetching $name ABI from Sourcify..."
  if curl -fsSL "$url" -o "$tmp"; then
    jq '.output.abi' "$tmp" > "${ABI_DIR}/${name}.json"
    echo "✓ Wrote ${ABI_DIR}/${name}.json"
  else
    echo "⚠️  Sourcify fetch failed for $name, writing fallback ABI."
    write_fallback "$name"
  fi
  rm -f "$tmp"
}

write_fallback() {
  local name="$1"
  case "$name" in
    Bridge)
      cat > "${ABI_DIR}/${name}.json" <<'EOF'
[
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "submitter", "type": "address" },
      { "indexed": true, "name": "messageHash", "type": "bytes32" }
    ],
    "name": "FailedToRelayMessage",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "name": "version", "type": "uint64" }],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "messageHash", "type": "bytes32" },
      { "indexed": true, "name": "mmrRoot", "type": "bytes32" },
      {
        "indexed": false,
        "name": "message",
        "type": "tuple",
        "components": [
          { "name": "nonce", "type": "uint64" },
          { "name": "sender", "type": "address" },
          { "name": "data", "type": "bytes" }
        ]
      }
    ],
    "name": "MessageInitiated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "submitter", "type": "address" },
      { "indexed": true, "name": "messageHash", "type": "bytes32" }
    ],
    "name": "MessageSuccessfullyRelayed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "name": "pendingOwner", "type": "address" }],
    "name": "OwnershipHandoverCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "name": "pendingOwner", "type": "address" }],
    "name": "OwnershipHandoverRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "oldOwner", "type": "address" },
      { "indexed": true, "name": "newOwner", "type": "address" }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "name": "paused", "type": "bool" }],
    "name": "PauseSwitched",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "user", "type": "address" },
      { "indexed": true, "name": "roles", "type": "uint256" }
    ],
    "name": "RolesUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "name": "localToken", "type": "address" },
      { "indexed": false, "name": "remoteToken", "type": "bytes32" },
      { "indexed": false, "name": "to", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "name": "TransferFinalized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "name": "localToken", "type": "address" },
      { "indexed": false, "name": "remoteToken", "type": "bytes32" },
      { "indexed": false, "name": "to", "type": "bytes32" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "name": "TransferInitialized",
    "type": "event"
  }
]
EOF
      ;;
    BridgeValidator)
      cat > "${ABI_DIR}/${name}.json" <<'EOF'
[
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "messageHash", "type": "bytes32" },
      { "indexed": false, "name": "signatures", "type": "bytes[]" }
    ],
    "name": "MessageApproved",
    "type": "event"
  }
]
EOF
      ;;
    CrossChainERC20Factory)
      cat > "${ABI_DIR}/${name}.json" <<'EOF'
[
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "localToken", "type": "address" },
      { "indexed": true, "name": "remoteToken", "type": "bytes32" },
      { "indexed": false, "name": "deployer", "type": "address" }
    ],
    "name": "CrossChainERC20Created",
    "type": "event"
  }
]
EOF
      ;;
    *)
      echo "No fallback defined for $name" >&2
      exit 1
      ;;
  esac
  echo "✓ Wrote fallback ${ABI_DIR}/${name}.json"
}

# Addresses on Base mainnet
fetch_or_fallback "0x3eff766C76a1be2Ce1aCF2B69c78bCae257D5188" "Bridge"
fetch_or_fallback "0xAF24c1c24Ff3BF1e6D882518120fC25442d6794B" "BridgeValidator"
fetch_or_fallback "0xDD56781d0509650f8C2981231B6C917f2D56781d" "CrossChainERC20Factory"

echo "Done."

