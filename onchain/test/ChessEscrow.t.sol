// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ChessEscrow.sol";

contract ChessEscrowTest is Test {
    ChessEscrow public escrow;
    address public owner;
    address public settler;
    address public player1;
    address public player2;
    address public nonPlayer;

    uint256 public constant WAGER_AMOUNT = 0.1 ether;

    function setUp() public {
        owner = address(this);
        settler = address(this);
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");
        nonPlayer = makeAddr("nonPlayer");

        escrow = new ChessEscrow();
        
        // Fund players
        vm.deal(player1, 1 ether);
        vm.deal(player2, 1 ether);
        vm.deal(nonPlayer, 1 ether);
    }

    function testCreateGame() public {
        string memory gameId = "test-game-1";
        
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        ChessEscrow.Game memory game = escrow.getGame(gameId);
        assertEq(game.gameId, gameId);
        assertEq(game.creator, player1);
        assertEq(game.opponent, address(0));
        assertEq(game.winner, address(0));
        assertEq(game.wagerAmount, WAGER_AMOUNT);
        assertTrue(game.creatorPaid);
        assertFalse(game.opponentPaid);
        assertFalse(game.settled);
    }

    function testCreateGameWithSpecificOpponent() public {
        string memory gameId = "test-game-2";
        
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, player2);
        
        ChessEscrow.Game memory game = escrow.getGame(gameId);
        assertEq(game.opponent, player2);
    }

    function testJoinOpenGame() public {
        string memory gameId = "test-game-3";
        
        // Create game
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        // Join game
        vm.prank(player2);
        escrow.joinGame{value: WAGER_AMOUNT}(gameId);
        
        ChessEscrow.Game memory game = escrow.getGame(gameId);
        assertEq(game.opponent, player2);
        assertTrue(game.opponentPaid);
    }

    function testJoinSpecificOpponentGame() public {
        string memory gameId = "test-game-4";
        
        // Create game with specific opponent
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, player2);
        
        // Correct opponent joins
        vm.prank(player2);
        escrow.joinGame{value: WAGER_AMOUNT}(gameId);
        
        ChessEscrow.Game memory game = escrow.getGame(gameId);
        assertEq(game.opponent, player2);
        assertTrue(game.opponentPaid);
    }

    function test_RevertWhen_WrongOpponentJoins() public {
        string memory gameId = "test-game-5";
        
        // Create game with specific opponent
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, player2);
        
        // Wrong opponent tries to join
        vm.prank(nonPlayer);
        vm.expectRevert("Only specified opponent can join");
        escrow.joinGame{value: WAGER_AMOUNT}(gameId);
    }

    function test_RevertWhen_WrongWagerAmount() public {
        string memory gameId = "test-game-6";
        
        // Create game
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        // Try to join with wrong amount
        vm.prank(player2);
        vm.expectRevert("Wager amount must match game wager");
        escrow.joinGame{value: WAGER_AMOUNT + 1}(gameId);
    }

    function test_RevertWhen_CreatorJoinsOwnGame() public {
        string memory gameId = "test-game-7";
        
        // Create game
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        // Creator tries to join their own game
        vm.prank(player1);
        vm.expectRevert("Creator cannot join their own game");
        escrow.joinGame{value: WAGER_AMOUNT}(gameId);
    }

    function testSettleGame() public {
        string memory gameId = "test-game-8";
        
        // Create and join game
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        vm.prank(player2);
        escrow.joinGame{value: WAGER_AMOUNT}(gameId);
        
        // Check game is ready to settle
        assertTrue(escrow.isGameReadyToSettle(gameId));
        
        // Settle game with player1 as winner
        uint256 player1BalanceBefore = player1.balance;
        escrow.settleGame(gameId, player1);
        
        // Check winner received winnings
        assertEq(player1.balance, player1BalanceBefore + (WAGER_AMOUNT * 2));
        
        // Check game is settled and winner is set
        ChessEscrow.Game memory game = escrow.getGame(gameId);
        assertTrue(game.settled);
        assertEq(game.winner, player1);
    }

    function test_RevertWhen_SettleGameNotReady() public {
        string memory gameId = "test-game-9";
        
        // Create game but don't join
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        // Try to settle before opponent joins
        vm.expectRevert("Both players must have paid their wagers");
        escrow.settleGame(gameId, player1);
    }

    function test_RevertWhen_SettleGameInvalidWinner() public {
        string memory gameId = "test-game-10";
        
        // Create and join game
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        vm.prank(player2);
        escrow.joinGame{value: WAGER_AMOUNT}(gameId);
        
        // Try to settle with invalid winner
        vm.expectRevert("Winner must be one of the game participants");
        escrow.settleGame(gameId, nonPlayer);
    }

    function test_RevertWhen_SettleGameTwice() public {
        string memory gameId = "test-game-11";
        
        // Create and join game
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        vm.prank(player2);
        escrow.joinGame{value: WAGER_AMOUNT}(gameId);
        
        // Settle game
        escrow.settleGame(gameId, player1);
        
        // Try to settle again
        vm.expectRevert("Game already settled");
        escrow.settleGame(gameId, player2);
    }

    function testUpdateSettler() public {
        address newSettler = makeAddr("newSettler");
        
        escrow.updateSettler(newSettler);
        assertEq(escrow.settler(), newSettler);
    }

    function test_RevertWhen_UpdateSettlerNotOwner() public {
        address newSettler = makeAddr("newSettler");
        
        vm.prank(player1);
        vm.expectRevert("Only owner can call this function");
        escrow.updateSettler(newSettler);
    }

    function test_RevertWhen_CreateGameWithZeroWager() public {
        string memory gameId = "test-game-12";
        
        vm.prank(player1);
        vm.expectRevert("Wager amount must be greater than 0");
        escrow.createGame{value: 0}(gameId, address(0));
    }

    function test_RevertWhen_CreateGameWithInvalidId() public {
        vm.prank(player1);
        vm.expectRevert("Invalid game ID");
        escrow.createGame{value: WAGER_AMOUNT}("", address(0));
    }

    function test_RevertWhen_CreateGameTwice() public {
        string memory gameId = "test-game-13";
        
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        vm.prank(player2);
        vm.expectRevert("Game already exists");
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
    }

    function testContractBalance() public {
        string memory gameId = "test-game-14";
        
        // Create and join game
        vm.prank(player1);
        escrow.createGame{value: WAGER_AMOUNT}(gameId, address(0));
        
        vm.prank(player2);
        escrow.joinGame{value: WAGER_AMOUNT}(gameId);
        
        // Contract should hold 2 * wager amount
        assertEq(escrow.getContractBalance(), WAGER_AMOUNT * 2);
    }

}
