// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ChessEscrow.sol";

/**
 * @title SetSettler
 * @dev Script to set the settler address on the ChessEscrow contract
 */
contract SetSettler is Script {
    // Contract address (update this with the deployed contract address)
    address constant CONTRACT_ADDRESS = 0xA0c2B9335491CD0DDdF5F1daB469709fCC259a5a;
    
    // New settler address
    address constant NEW_SETTLER = 0x2FCEBBc1772f307B4BDAae06FeA0B49Bdf00b7a6;

    function run() external {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Get the contract instance
        ChessEscrow escrow = ChessEscrow(payable(CONTRACT_ADDRESS));
        
        // Call updateSettler function
        escrow.updateSettler(NEW_SETTLER);
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        console.log("Settler address updated to:", NEW_SETTLER);
        console.log("Contract address:", CONTRACT_ADDRESS);
    }
}
