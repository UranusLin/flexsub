// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FlexSubManager.sol";

/**
 * @title DeployFlexSub
 * @notice Deployment script for FlexSubManager contract
 *
 * Usage:
 *   # Deploy to Arbitrum Sepolia (testnet)
 *   forge script script/Deploy.s.sol:DeployFlexSub --rpc-url arbitrum-sepolia --broadcast
 *
 *   # Deploy to Arbitrum (mainnet)
 *   forge script script/Deploy.s.sol:DeployFlexSub --rpc-url arbitrum --broadcast
 */
contract DeployFlexSub is Script {
    // USDC addresses on different networks
    address constant USDC_ARBITRUM = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address constant USDC_ARBITRUM_SEPOLIA =
        0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address constant USDC_OPTIMISM = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        // Use PRIVATE_KEY env var, or fallback to Anvil's default first account for local testing
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(
                0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
            )
        );
        address usdc = getUsdcAddress();

        console.log("Deploying FlexSubManager...");
        console.log("Network:", block.chainid);
        console.log("USDC:", usdc);

        vm.startBroadcast(deployerPrivateKey);

        FlexSubManager flexsub = new FlexSubManager(usdc);

        vm.stopBroadcast();

        console.log("FlexSubManager deployed to:", address(flexsub));
        console.log("");
        console.log("Add this to your .env:");
        console.log("FLEXSUB_ADDRESS=", address(flexsub));
    }

    function getUsdcAddress() internal view returns (address) {
        uint256 chainId = block.chainid;

        if (chainId == 42161) {
            return USDC_ARBITRUM; // Arbitrum One
        } else if (chainId == 421614) {
            return USDC_ARBITRUM_SEPOLIA; // Arbitrum Sepolia
        } else if (chainId == 10) {
            return USDC_OPTIMISM; // Optimism
        } else if (chainId == 8453) {
            return USDC_BASE; // Base
        } else {
            // Default to a mock address for local testing
            console.log("Warning: Unknown chain, using mock USDC");
            return address(0x1234567890123456789012345678901234567890);
        }
    }
}
