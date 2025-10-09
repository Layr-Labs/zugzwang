# Chess Escrow Contract

A smart contract for managing escrow of wagers in chess games on Ethereum-compatible networks.

## Overview

The `ChessEscrow` contract enables players to create chess games with wagers, where both players must deposit the same amount of ETH before the game can begin. The contract holds the wagers in escrow until the game is settled, at which point the total winnings (2x the wager amount) are distributed to the winner.

## Features

- **Game Creation**: Players can create games with a unique string ID and optional opponent address
- **Wager Escrow**: Both players must deposit the exact wager amount in ETH
- **Open or Private Games**: Games can be open to anyone or restricted to a specific opponent
- **Settlement**: Authorized settler can distribute winnings to the winner and track the winner
- **Winner Tracking**: Game structure stores the winner address after settlement
- **Security**: Multiple safety checks and access controls
- **Emergency Functions**: Owner can withdraw funds in extreme circumstances

## Contract Functions

### Core Functions

#### `createGame(string memory _gameId, address _opponent)`
Creates a new game with a wager. The caller must send exactly the wager amount as `msg.value`.
- `_gameId`: Unique string identifier for the game
- `_opponent`: Optional opponent address (use `address(0)` for open games)

#### `joinGame(string memory _gameId)`
Joins an existing game. The caller must send exactly the wager amount as `msg.value`.
- `_gameId`: Unique string identifier for the game

#### `settleGame(string memory _gameId, address _winner)`
Settles a game and distributes winnings to the winner. Only the authorized settler can call this.
- `_gameId`: Unique string identifier for the game
- `_winner`: Address of the winner (must be one of the game participants)

### View Functions

#### `getGame(string memory _gameId)`
Returns the complete game structure for a given game ID.

#### `isGameReadyToSettle(string memory _gameId)`
Returns `true` if both players have paid their wagers and the game is not yet settled.

#### `getContractBalance()`
Returns the total ETH balance held by the contract.

### Administrative Functions

#### `updateSettler(address _newSettler)`
Updates the address authorized to settle games. Only the owner can call this.

#### `emergencyWithdraw()`
Emergency function to withdraw all contract funds. Only the owner can call this.

## Game Lifecycle

1. **Creation**: Player A calls `createGame()` with a unique game ID and wager amount
2. **Joining**: Player B calls `joinGame()` with the same game ID and matching wager amount
3. **Settlement**: Authorized settler calls `settleGame()` with the winner's address
4. **Distribution**: Winner receives 2x the wager amount

## Security Features

- **Access Control**: Only owner can update settler, only settler can settle games
- **Wager Validation**: Exact wager amounts required for both creation and joining
- **Game State Validation**: Prevents double-joining, invalid settlements, etc.
- **Address Validation**: Winner must be one of the game participants
- **Emergency Functions**: Owner can recover funds if needed

## Events

- `GameCreated`: Emitted when a game is created
- `GameJoined`: Emitted when a player joins a game
- `GameSettled`: Emitted when a game is settled and winnings distributed
- `SettlerUpdated`: Emitted when the settler address is updated

## Testing

The contract includes comprehensive tests covering:
- Game creation and joining
- Wager validation
- Settlement logic
- Access control
- Error conditions
- Edge cases

Run tests with:
```bash
forge test --match-contract ChessEscrowTest -vv
```

## Deployment

Deploy the contract using the provided script:
```bash
forge script script/DeployChessEscrow.s.sol --rpc-url <RPC_URL> --broadcast --verify
```

## Usage Example

```solidity
// Create a game
string memory gameId = "my-chess-game";
escrow.createGame{value: 0.1 ether}(gameId, address(0));

// Join the game
escrow.joinGame{value: 0.1 ether}(gameId);

// Settle the game (only settler can do this)
escrow.settleGame(gameId, winnerAddress);
```

## Network Support

This contract is designed to work on any Ethereum-compatible network, including:
- Ethereum Mainnet
- Ethereum Sepolia (testnet)
- Base Sepolia (testnet)
- Other EVM-compatible networks

## License

MIT License - see LICENSE file for details.