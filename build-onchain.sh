#!/bin/bash

# Build onchain contracts and copy ABI to frontend and backend
set -e

echo "🔨 Building onchain contracts..."

# Navigate to onchain directory
cd onchain

# Build the contracts
echo "📦 Running forge build..."
forge build

# Extract ABI from the build artifacts
echo "📋 Extracting ABI from ChessEscrow contract..."
ABI_FILE="../src/contracts/ChessEscrow.json"
FRONTEND_ABI_FILE="../frontend/src/contracts/ChessEscrow.json"

    # Create contracts directories if they don't exist
    mkdir -p ../src/contracts
    mkdir -p ../dist/contracts
    mkdir -p ../frontend/src/contracts

# Extract ABI from the build artifact
if [ -f "out/ChessEscrow.sol/ChessEscrow.json" ]; then
    echo "✅ Found ChessEscrow build artifact"
    
    # Extract just the ABI from the build artifact
    jq '.abi' out/ChessEscrow.sol/ChessEscrow.json > "$ABI_FILE"
    jq '.abi' out/ChessEscrow.sol/ChessEscrow.json > "$FRONTEND_ABI_FILE"
    jq '.abi' out/ChessEscrow.sol/ChessEscrow.json > "../dist/contracts/ChessEscrow.json"
    
    echo "✅ ABI copied to backend: $ABI_FILE"
    echo "✅ ABI copied to frontend: $FRONTEND_ABI_FILE"
    echo "✅ ABI copied to dist: ../dist/contracts/ChessEscrow.json"
    
    # Use the deployed contract address (hardcoded for now)
    CONTRACT_ADDRESS="0xEbFC063d8e19C90Cd4264b245FB4884CB7F6D60b"
    echo "📝 Contract Address: $CONTRACT_ADDRESS"
    
    # Create a metadata file for easy access
    cat > ../src/contracts/ChessEscrowMetadata.json << EOF
{
  "address": "$CONTRACT_ADDRESS",
  "chainId": 84532,
  "network": "base-sepolia"
}
EOF
    
    cat > ../dist/contracts/ChessEscrowMetadata.json << EOF
{
  "address": "$CONTRACT_ADDRESS",
  "chainId": 84532,
  "network": "base-sepolia"
}
EOF
    
    cat > ../frontend/src/contracts/ChessEscrowMetadata.json << EOF
{
  "address": "$CONTRACT_ADDRESS",
  "chainId": 84532,
  "network": "base-sepolia"
}
EOF
    
    echo "✅ Contract metadata created"
else
    echo "❌ ChessEscrow build artifact not found!"
    echo "Make sure the contract is properly built with 'forge build'"
    exit 1
fi

echo "🎉 Build and ABI extraction complete!"
echo ""
echo "📁 Files created:"
echo "  - Backend ABI: $ABI_FILE"
echo "  - Frontend ABI: $FRONTEND_ABI_FILE"
echo "  - Dist ABI: ../dist/contracts/ChessEscrow.json"
echo "  - Backend Metadata: ../src/contracts/ChessEscrowMetadata.json"
echo "  - Dist Metadata: ../dist/contracts/ChessEscrowMetadata.json"
echo "  - Frontend Metadata: ../frontend/src/contracts/ChessEscrowMetadata.json"
