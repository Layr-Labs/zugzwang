// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/console.sol";

/**
 * @title ChessEscrow
 * @dev Escrow contract for chess games with wagers
 * @notice This contract manages the escrow of wagers for chess games
 */
contract ChessEscrow {
    // Events
    event GameCreated(string gameId, bytes32 indexed gameIdHash, address indexed creator, uint256 wagerAmount);
    event GameJoined(string gameId, bytes32 indexed gameIdHash, address indexed joiner, uint256 wagerAmount);
    event GameSettled(bytes32 indexed gameId, address indexed winner, uint256 totalWinnings);
    event SettlerUpdated(address indexed oldSettler, address indexed newSettler);

    // Struct to represent a game
    struct Game {
        string gameId;
        address creator;
        address opponent;
        address winner;
        uint256 wagerAmount;
        bool creatorPaid;
        bool opponentPaid;
        bool settled;
        uint256 createdAt;
    }

    // State variables
    address public owner;
    address public settler; // Address authorized to settle games
    mapping(string => Game) public games;
    mapping(address => uint256) public pendingWithdrawals; // For failed settlements

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlySettler() {
        require(msg.sender == settler, "Only settler can call this function");
        _;
    }

    modifier gameExists(string memory _gameId) {
        require(bytes(games[_gameId].gameId).length > 0, "Game does not exist");
        _;
    }

    modifier gameNotSettled(string memory _gameId) {
        require(!games[_gameId].settled, "Game already settled");
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
        settler = msg.sender; // Initially, owner is also the settler
    }

    /**
     * @dev Create a new game with a wager
     * @param _gameId The unique identifier for the game
     * @param _opponent Optional opponent address (can be address(0) for open games)
     * @notice The caller must send exactly the wager amount as msg.value
     */
    function createGame(string memory _gameId, address _opponent) external payable {
        require(bytes(_gameId).length > 0, "Invalid game ID");
        require(bytes(games[_gameId].gameId).length == 0, "Game already exists");
        require(msg.value > 0, "Wager amount must be greater than 0");

        games[_gameId] = Game({
            gameId: _gameId,
            creator: msg.sender,
            opponent: _opponent,
            winner: address(0),
            wagerAmount: msg.value,
            creatorPaid: true,
            opponentPaid: false,
            settled: false,
            createdAt: block.timestamp
        });

        emit GameCreated(_gameId, keccak256(bytes(_gameId)), msg.sender, msg.value);
    }

    /**
     * @dev Join an existing game
     * @param _gameId The unique identifier for the game
     * @notice The caller must send exactly the wager amount as msg.value
     */
    function joinGame(string memory _gameId) external payable gameExists(_gameId) gameNotSettled(_gameId) {
        Game storage game = games[_gameId];
        
        require(!game.opponentPaid, "Game already has an opponent");
        require(msg.value == game.wagerAmount, "Wager amount must match game wager");
        require(msg.sender != game.creator, "Creator cannot join their own game");
        
        // If game has a specific opponent, only that opponent can join
        if (game.opponent != address(0)) {
            require(msg.sender == game.opponent, "Only specified opponent can join");
        }

        game.opponent = msg.sender;
        game.opponentPaid = true;

        emit GameJoined(_gameId, keccak256(bytes(_gameId)), msg.sender, msg.value);
    }

    /**
     * @dev Settle a game and distribute winnings
     * @param _gameId The unique identifier for the game
     * @param _winner The address of the winner
     * @notice Only the settler can call this function
     */
    function settleGame(string memory _gameId, address _winner) 
        external 
        onlySettler 
        gameExists(_gameId) 
        gameNotSettled(_gameId) 
    {
        Game storage game = games[_gameId];
        
        require(game.creatorPaid && game.opponentPaid, "Both players must have paid their wagers");
        require(
            _winner == game.creator || _winner == game.opponent, 
            "Winner must be one of the game participants"
        );

        uint256 totalWinnings = game.wagerAmount * 2;
        game.settled = true;
        game.winner = _winner;

        // Transfer winnings to winner
        (bool success, ) = payable(_winner).call{value: totalWinnings}("");
        if (!success) {
            // If transfer fails, store for manual withdrawal
            pendingWithdrawals[_winner] += totalWinnings;
        }

        emit GameSettled(keccak256(bytes(_gameId)), _winner, totalWinnings);
    }

    /**
     * @dev Get game details
     * @param _gameId The unique identifier for the game
     * @return Game struct containing all game information
     */
    function getGame(string memory _gameId) external view gameExists(_gameId) returns (Game memory) {
        return games[_gameId];
    }

    /**
     * @dev Check if a game is ready to be settled
     * @param _gameId The unique identifier for the game
     * @return bool True if both players have paid and game is not settled
     */
    function isGameReadyToSettle(string memory _gameId) external view gameExists(_gameId) returns (bool) {
        Game memory game = games[_gameId];
        return game.creatorPaid && game.opponentPaid && !game.settled;
    }

    /**
     * @dev Update the settler address
     * @param _newSettler The new settler address
     * @notice Only the owner can call this function
     */
    function updateSettler(address _newSettler) external onlyOwner {
        require(_newSettler != address(0), "Settler cannot be zero address");
        address oldSettler = settler;
        settler = _newSettler;
        emit SettlerUpdated(oldSettler, _newSettler);
    }

    /**
     * @dev Withdraw pending funds (for failed settlements)
     * @notice Allows users to withdraw funds that couldn't be transferred during settlement
     */
    function withdrawPending() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawals");
        
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get contract balance
     * @return uint256 The total ETH held by the contract
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Emergency function to withdraw all funds (only owner)
     * @notice This should only be used in extreme circumstances
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }

    // Fallback function to receive ETH
    receive() external payable {
        // Allow contract to receive ETH
    }
}
