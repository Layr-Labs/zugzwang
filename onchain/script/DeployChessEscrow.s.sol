// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ChessEscrow.sol";

contract DeployChessEscrow is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying ChessEscrow contract...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        ChessEscrow escrow = new ChessEscrow();
        
        vm.stopBroadcast();
        
        console.log("ChessEscrow deployed at:", address(escrow));
        console.log("Owner:", escrow.owner());
        console.log("Settler:", escrow.settler());
        
        // Test creating a game with string ID
        console.log("Testing game creation with string ID...");
        escrow.createGame{value: 0.01 ether}("test-game", address(0));
        console.log("Test game created successfully!");
    }
}
