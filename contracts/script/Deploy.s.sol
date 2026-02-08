// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FlexSubManager.sol";
import "../src/MockUSDC.sol";

/**
 * @title DeployFlexSub
 * @notice Deployment script for FlexSubManager contract
 *
 * Usage:
 *   # Deploy to Anvil (local)
 *   forge script script/Deploy.s.sol:DeployFlexSub --rpc-url http://127.0.0.1:8545 --broadcast
 *
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
    address constant USDC_BASE_SEPOLIA =
        0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        // Try to get PRIVATE_KEY from environment
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));

        uint256 chainId = block.chainid;
        console.log("Deploying FlexSub...");
        console.log("Chain ID:", chainId);

        address deployer;
        if (deployerPrivateKey != 0) {
            deployer = vm.addr(deployerPrivateKey);
            console.log("Deployer:", deployer);
            vm.startBroadcast(deployerPrivateKey);
        } else {
            console.log("Using default broadcast account (from flag or env)");
            vm.startBroadcast();
            deployer = msg.sender;
            console.log("Deployer:", deployer);
        }

        address usdcAddress;

        // For local Anvil, deploy MockUSDC
        if (chainId == 31337) {
            console.log("");
            console.log("=== Deploying MockUSDC for local testing ===");
            MockUSDC mockUsdc = new MockUSDC();
            usdcAddress = address(mockUsdc);
            console.log("MockUSDC deployed to:", usdcAddress);
            console.log(
                "Deployer USDC balance:",
                mockUsdc.balanceOf(deployer) / 1e6,
                "USDC"
            );
        } else {
            usdcAddress = getUsdcAddress(chainId);
        }

        console.log("");
        console.log("=== Deploying FlexSubManager ===");
        console.log("Using USDC:", usdcAddress);

        FlexSubManager flexsub = new FlexSubManager(usdcAddress);

        // On Anvil, create demo subscription plans
        if (chainId == 31337) {
            console.log("");
            console.log("=== Creating Demo Subscription Plans ===");

            // Plan 1: Basic - $4.99/month
            flexsub.createPlan(4990000, 30 days, "Basic Plan");
            console.log("Created Plan 1: Basic Plan - $4.99/month");

            // Plan 2: Pro - $9.99/month
            flexsub.createPlan(9990000, 30 days, "Pro Plan");
            console.log("Created Plan 2: Pro Plan - $9.99/month");

            // Plan 3: Enterprise - $29.99/month
            flexsub.createPlan(29990000, 30 days, "Enterprise Plan");
            console.log("Created Plan 3: Enterprise Plan - $29.99/month");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("FlexSubManager deployed to:", address(flexsub));
        console.log("USDC Token:", usdcAddress);
        if (chainId == 31337) {
            console.log("Demo Plans: 3 plans created (IDs: 1, 2, 3)");
        }
        console.log("========================================");
        console.log("");
        console.log("Update providers.tsx with:");
        console.log("  contractAddress:", address(flexsub));
        console.log("  usdcAddress:", usdcAddress);
    }

    function getUsdcAddress(uint256 chainId) internal pure returns (address) {
        if (chainId == 42161) {
            return USDC_ARBITRUM; // Arbitrum One
        } else if (chainId == 421614) {
            return USDC_ARBITRUM_SEPOLIA; // Arbitrum Sepolia
        } else if (chainId == 10) {
            return USDC_OPTIMISM; // Optimism
        } else if (chainId == 8453) {
            return USDC_BASE; // Base
        } else if (chainId == 84532) {
            return USDC_BASE_SEPOLIA; // Base Sepolia
        } else {
            revert("Unsupported chain");
        }
    }
}
