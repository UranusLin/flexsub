#!/bin/bash
# Deploy contracts and output addresses to JSON for frontend to read

set -e

# Get the absolute path of the project root (where this script is called from)
PROJECT_ROOT="$(pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
OUTPUT_FILE="$PROJECT_ROOT/demo/src/app/deployments.json"

echo "🚀 Deploying contracts to Anvil..."
echo "   Project root: $PROJECT_ROOT"
echo "   Output file: $OUTPUT_FILE"

cd "$CONTRACTS_DIR"

# Run forge script and capture output
OUTPUT=$(forge script script/Deploy.s.sol:DeployFlexSub --rpc-url http://127.0.0.1:8545 --broadcast 2>&1)

# Extract addresses from output
USDC_ADDRESS=$(echo "$OUTPUT" | grep "MockUSDC deployed to:" | awk '{print $NF}')
FLEXSUB_ADDRESS=$(echo "$OUTPUT" | grep "FlexSubManager deployed to:" | awk '{print $NF}')

if [ -z "$USDC_ADDRESS" ] || [ -z "$FLEXSUB_ADDRESS" ]; then
    echo "❌ Failed to extract contract addresses"
    echo "$OUTPUT"
    exit 1
fi

echo ""
echo "📝 Writing deployments to $OUTPUT_FILE"

# Ensure directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Generate JSON file
cat > "$OUTPUT_FILE" << EOF
{
  "31337": {
    "name": "Anvil Local",
    "contractAddress": "$FLEXSUB_ADDRESS",
    "usdcAddress": "$USDC_ADDRESS",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF

echo ""
echo "✅ Deployment complete!"
echo "   MockUSDC:        $USDC_ADDRESS"
echo "   FlexSubManager:  $FLEXSUB_ADDRESS"
echo ""
echo "   Addresses saved to: demo/src/app/deployments.json"
