// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for local testing on Anvil
 * @dev Anyone can mint tokens via the faucet function
 */
contract MockUSDC is ERC20 {
    uint8 private constant DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10 ** DECIMALS; // 10,000 USDC per request

    constructor() ERC20("Mock USDC", "USDC") {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1_000_000 * 10 ** DECIMALS); // 1M USDC
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Faucet function - anyone can mint test USDC
     * @dev Mints 10,000 USDC to the caller
     */
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @notice Faucet to specific address
     * @param to Address to receive test USDC
     */
    function faucetTo(address to) external {
        _mint(to, FAUCET_AMOUNT);
    }

    /**
     * @notice Mint arbitrary amount (for testing)
     * @param to Address to receive tokens
     * @param amount Amount to mint (in wei, 6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
