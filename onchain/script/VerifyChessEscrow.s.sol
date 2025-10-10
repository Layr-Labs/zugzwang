// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

contract VerifyChessEscrow is Script {
    function run() external {
        // Contract address on Base Sepolia
        address contractAddress = 0xEbFC063d8e19C90Cd4264b245FB4884CB7F6D60b;
        
        console.log("Contract Address:", contractAddress);
        console.log("Network: Base Sepolia");
        console.log("Chain ID: 84532");
        console.log("Verification URL: https://sepolia.basescan.org/address/", contractAddress);
        console.log("");
        console.log("To verify manually:");
        console.log("1. Go to: https://sepolia.basescan.org/address/", contractAddress);
        console.log("2. Click 'Contract' tab");
        console.log("3. Click 'Verify and Publish'");
        console.log("4. Use these settings:");
        console.log("   - Contract Address:", contractAddress);
        console.log("   - Compiler Type: Solidity (Single file)");
        console.log("   - Compiler Version: v0.8.27+commit.20160e8a");
        console.log("   - License: MIT");
        console.log("   - Contract Source Code: Copy from src/ChessEscrow.sol");
    }
}
