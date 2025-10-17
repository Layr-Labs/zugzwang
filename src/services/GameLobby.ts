import { Game, GameState, NetworkType } from '../types/Game';
import { ChessEngine } from './ChessEngine';
import { randomUUID } from 'crypto';

export class GameLobby {
  private static instance: GameLobby;
  private games: Map<string, Game> = new Map();

  private constructor() {}

  public static getInstance(): GameLobby {
    if (!GameLobby.instance) {
      GameLobby.instance = new GameLobby();
    }
    return GameLobby.instance;
  }

  /**
   * Create a new game from blockchain event
   */
  public async createGameFromEvent(eventData: {
    id: string;
    creator: string;
    opponent: string | null;
    wagerAmount: string;
    networkType: NetworkType;
    chainId: number;
    status: string;
    createdAt: Date;
    escrow: {
      contractAddress: string;
      transactionHash: string;
      blockNumber: number;
    };
  }): Promise<Game> {
    const wagerBigInt = BigInt(eventData.wagerAmount);
    
    // Map status to GameState
    let state: GameState;
    switch (eventData.status) {
      case 'waiting':
        state = GameState.WAITING;
        break;
      case 'created':
        state = GameState.CREATED;
        break;
      default:
        state = GameState.CREATED;
    }
    
    const game: Game = {
      id: eventData.id,
      owner: eventData.creator,
      opponent: eventData.opponent,
      wager: wagerBigInt,
      state: state,
      networkType: eventData.networkType,
      chainId: eventData.chainId,
      createdAt: eventData.createdAt,
      escrow: {
        contractAddress: eventData.escrow.contractAddress,
        transactionHash: eventData.escrow.transactionHash,
        blockNumber: eventData.escrow.blockNumber
      }
    };

    console.log('🎮 [GAME_LOBBY] Created game from event:', {
      id: eventData.id,
      creator: eventData.creator,
      opponent: eventData.opponent,
      wager: eventData.wagerAmount,
      state: state,
      escrow: eventData.escrow
    });

    this.games.set(eventData.id, game);
    return game;
  }

  /**
   * Create a new game
   */
  public createGame(owner: string, opponent: string | null, wager: string, networkType: NetworkType, chainId?: number): Game {
    const gameId = randomUUID();
    const wagerBigInt = BigInt(wager);
    
    // Set state based on whether opponent is specified
    const state = opponent ? GameState.WAITING : GameState.CREATED;
    
    const game: Game = {
      id: gameId,
      owner,
      opponent,
      wager: wagerBigInt,
      state: state,
      networkType,
      chainId,
      createdAt: new Date()
    };

    console.log('🎮 [GAME_LOBBY] Created game:', {
      id: gameId,
      owner: owner,
      opponent: opponent,
      wager: wager,
      state: state
    });

    this.games.set(gameId, game);
    return game;
  }

  /**
   * Join an existing open game (CREATED state)
   */
  public joinGame(gameId: string, opponent: string): Game | null {
    const game = this.games.get(gameId);
    
    if (!game) {
      return null; // Game not found
    }

    if (game.state !== GameState.CREATED) {
      return null; // Game is not in CREATED state
    }

    // Check if there's a required opponent
    if (game.opponent && game.opponent !== opponent) {
      return null; // Wrong opponent
    }

    // Update game state
    game.opponent = opponent;
    game.state = GameState.STARTED;
    game.startedAt = new Date();

    // Initialize chess game state
    const chessEngine = ChessEngine.getInstance();
    game.chessState = chessEngine.createInitialPosition();

    this.games.set(game.id, game);
    return game;
  }


  /**
   * Settle a game (mark as completed)
   */
  public settleGame(gameId: string): Game | null {
    const game = this.games.get(gameId);
    
    if (!game) {
      return null; // Game not found
    }

    if (game.state !== GameState.STARTED) {
      return null; // Game is not in STARTED state
    }

    game.state = GameState.SETTLED;
    game.settledAt = new Date();

    this.games.set(game.id, game);
    return game;
  }

  /**
   * Get a specific game by ID
   */
  public getGame(gameId: string): Game | null {
    return this.games.get(gameId) || null;
  }

  /**
   * Get all games
   */
  public getAllGames(): Game[] {
    return Array.from(this.games.values());
  }

  /**
   * Get games by state
   */
  public getGamesByState(state: GameState): Game[] {
    return Array.from(this.games.values()).filter(game => game.state === state);
  }

  /**
   * Get games by owner
   */
  public getGamesByOwner(owner: string): Game[] {
    console.log('🔍 [GAME_LOBBY] getGamesByOwner called with:', owner);
    const allGames = Array.from(this.games.values());
    console.log('🔍 [GAME_LOBBY] All games in lobby:', allGames.map(g => ({ 
      id: g.id, 
      owner: g.owner, 
      ownerLower: g.owner.toLowerCase(),
      state: g.state, 
      opponent: g.opponent 
    })));
    
    const games = allGames.filter(game => {
      const match = game.owner.toLowerCase() === owner.toLowerCase();
      console.log('🔍 [GAME_LOBBY] Comparing:', {
        gameOwner: game.owner,
        gameOwnerLower: game.owner.toLowerCase(),
        searchOwner: owner,
        searchOwnerLower: owner.toLowerCase(),
        match: match
      });
      return match;
    });
    
    console.log('🔍 [GAME_LOBBY] Found games for owner:', {
      owner: owner,
      gameCount: games.length,
      games: games.map(g => ({ id: g.id, owner: g.owner, state: g.state, opponent: g.opponent }))
    });
    return games;
  }

  /**
   * Get games by opponent
   */
  public getGamesByOpponent(opponent: string): Game[] {
    return Array.from(this.games.values()).filter(game => 
      game.opponent && game.opponent.toLowerCase() === opponent.toLowerCase()
    );
  }

  /**
   * Get open games (WAITING state with no required opponent, excluding games created by the requesting user)
   */
  public getOpenGames(excludeUserAddress?: string): Game[] {
    console.log('🔍 [GAME_LOBBY] getOpenGames called with excludeUserAddress:', excludeUserAddress);
    const allGames = Array.from(this.games.values());
    console.log('🔍 [GAME_LOBBY] Total games in lobby:', allGames.length);
    
    const openGames = allGames.filter(
      game => game.state === GameState.WAITING && 
              (game.opponent === null || game.opponent === undefined) &&
              (!excludeUserAddress || game.owner.toLowerCase() !== excludeUserAddress.toLowerCase())
    );
    
    console.log('🔍 [GAME_LOBBY] Open games found:', {
      totalGames: allGames.length,
      openGamesCount: openGames.length,
      excludeUserAddress: excludeUserAddress,
      openGames: openGames.map(g => ({ id: g.id, owner: g.owner, state: g.state, opponent: g.opponent }))
    });
    
    return openGames;
  }

  /**
   * Get active games (STARTED state where user is owner or opponent)
   */
  public getActiveGames(userAddress: string): Game[] {
    return Array.from(this.games.values()).filter(
      game => game.state === GameState.STARTED && 
              (game.owner.toLowerCase() === userAddress.toLowerCase() || 
               (game.opponent && game.opponent.toLowerCase() === userAddress.toLowerCase()))
    );
  }

  /**
   * Get settled games (SETTLED state where user was owner or opponent)
   */
  public getSettledGames(userAddress: string): Game[] {
    return Array.from(this.games.values()).filter(
      game => game.state === GameState.SETTLED && 
              (game.owner.toLowerCase() === userAddress.toLowerCase() || 
               (game.opponent && game.opponent.toLowerCase() === userAddress.toLowerCase()))
    );
  }

  /**
   * Get games where user was invited as opponent (WAITING state)
   */
  public getGameInvitations(userAddress: string): Game[] {
    console.log('🔍 [GAME_LOBBY] getGameInvitations called with userAddress:', userAddress);
    const invitations = Array.from(this.games.values()).filter(
      game => game.state === GameState.WAITING && 
              game.opponent && 
              game.opponent.toLowerCase() === userAddress.toLowerCase()
    );
    
    console.log('🔍 [GAME_LOBBY] Game invitations found:', {
      userAddress: userAddress,
      invitationCount: invitations.length,
      invitations: invitations.map(g => ({ id: g.id, owner: g.owner, state: g.state, opponent: g.opponent }))
    });
    
    return invitations;
  }

  /**
   * Get chess game state for a game
   */
  public getChessGameState(gameId: string): any | null {
    const game = this.games.get(gameId);
    
    if (!game) {
      return null;
    }
    
    // If game is STARTED but has no chess state, initialize it
    if (game.state === GameState.STARTED && !game.chessState) {
      const { ChessEngine } = require('./ChessEngine');
      const chessEngine = ChessEngine.getInstance();
      game.chessState = chessEngine.createInitialPosition();
      console.log('🎮 [GAME_LOBBY] Initialized chess state for game:', gameId);
    }
    
    return game?.chessState || null;
  }

  /**
   * Make a chess move
   */
  public makeChessMove(gameId: string, fromRow: number, fromCol: number, toRow: number, toCol: number, playerAddress: string, promotionPiece?: string): { success: boolean; move?: any; gameState?: any; error?: string } {
    console.log('🎮 [GAME_LOBBY] makeChessMove called:', {
      gameId: gameId.substring(0, 8) + '...',
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      playerAddress: playerAddress.substring(0, 8) + '...',
      promotionPiece: promotionPiece
    });

    const game = this.games.get(gameId);
    
    if (!game) {
      console.log('❌ [GAME_LOBBY] Game not found');
      return { success: false, error: 'Game not found' };
    }

    console.log('📋 [GAME_LOBBY] Game found:', {
      state: game.state,
      hasChessState: !!game.chessState,
      owner: game.owner?.substring(0, 8) + '...',
      opponent: game.opponent?.substring(0, 8) + '...',
      currentPlayer: game.chessState?.currentPlayer
    });

    if (game.state !== GameState.STARTED) {
      console.log('❌ [GAME_LOBBY] Game is not active, state:', game.state);
      return { success: false, error: 'Game is not active' };
    }

    if (!game.chessState) {
      console.log('❌ [GAME_LOBBY] Chess state not initialized');
      return { success: false, error: 'Chess state not initialized' };
    }

    // Check if it's the player's turn
    const isOwner = game.owner.toLowerCase() === playerAddress.toLowerCase();
    const isOpponent = game.opponent && game.opponent.toLowerCase() === playerAddress.toLowerCase();
    
    console.log('👤 [GAME_LOBBY] Player validation:', {
      isOwner: isOwner,
      isOpponent: isOpponent,
      playerAddress: playerAddress.substring(0, 8) + '...',
      gameOwner: game.owner?.substring(0, 8) + '...',
      gameOpponent: game.opponent?.substring(0, 8) + '...'
    });
    
    if (!isOwner && !isOpponent) {
      console.log('❌ [GAME_LOBBY] Player not in game');
      return { success: false, error: 'You are not a player in this game' };
    }

    // Determine player color
    const playerColor = isOwner ? 'white' : 'black';
    console.log('🎨 [GAME_LOBBY] Player color determined:', {
      playerColor: playerColor,
      currentPlayer: game.chessState.currentPlayer,
      isTurn: game.chessState.currentPlayer === playerColor
    });

    if (game.chessState.currentPlayer !== playerColor) {
      console.log('❌ [GAME_LOBBY] Not player\'s turn');
      return { success: false, error: 'Not your turn' };
    }

    // Get piece info before move
    const pieceBeforeMove = game.chessState.board[fromRow][fromCol].piece;
    const targetPieceBeforeMove = game.chessState.board[toRow][toCol].piece;
    
    console.log('♟️ [GAME_LOBBY] Move details:', {
      pieceMoving: pieceBeforeMove ? `${pieceBeforeMove.color} ${pieceBeforeMove.type}` : 'none',
      targetSquare: targetPieceBeforeMove ? `${targetPieceBeforeMove.color} ${targetPieceBeforeMove.type}` : 'empty',
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol }
    });

    // Make the move
    console.log('🔄 [GAME_LOBBY] Calling ChessEngine.makeMove...');
    const chessEngine = ChessEngine.getInstance();
    const result = chessEngine.makeMove(game.chessState, fromRow, fromCol, toRow, toCol, promotionPiece as any);
    
    console.log('⚙️ [GAME_LOBBY] ChessEngine result:', {
      success: result.success,
      hasNewGameState: !!result.newGameState,
      hasMove: !!result.move,
      error: result.error,
      moveDetails: result.move ? {
        from: result.move.from,
        to: result.move.to,
        piece: result.move.piece ? `${result.move.piece.color} ${result.move.piece.type}` : 'none',
        capturedPiece: result.move.capturedPiece ? `${result.move.capturedPiece.color} ${result.move.capturedPiece.type}` : 'none'
      } : null,
      newGameStateDetails: result.newGameState ? {
        currentPlayer: result.newGameState.currentPlayer,
        gameStatus: result.newGameState.gameStatus,
        fullMoveNumber: result.newGameState.fullMoveNumber,
        winner: result.newGameState.winner,
        moveHistoryLength: result.newGameState.moveHistory?.length || 0
      } : null
    });
    
    if (result.success && result.newGameState) {
      console.log('💾 [GAME_LOBBY] Updating game state in memory');
      game.chessState = result.newGameState;
      
      // Check if the chess game is in a terminal state (checkmate or stalemate)
      if (result.newGameState.gameStatus === 'checkmate' || result.newGameState.gameStatus === 'stalemate') {
        console.log('🏁 [GAME_LOBBY] Chess game ended, updating main game state to SETTLED');
        game.state = GameState.SETTLED;
        game.winner = result.newGameState.winner;
        console.log('🎯 [GAME_LOBBY] Game settled:', {
          gameStatus: result.newGameState.gameStatus,
          winner: result.newGameState.winner,
          gameState: game.state
        });

        // Trigger escrow settlement for checkmate (not stalemate)
        if (result.newGameState.gameStatus === 'checkmate' && result.newGameState.winner) {
          this.settleGameOnEscrow(gameId, result.newGameState.winner, game.chainId);
        }
      }
      
      this.games.set(gameId, game);
      console.log('✅ [GAME_LOBBY] Game state updated successfully');
    } else {
      console.log('❌ [GAME_LOBBY] Move failed, not updating game state');
    }

    console.log('📤 [GAME_LOBBY] Returning result to route handler');
    
    // Map the ChessEngine result to the expected format
    const mappedResult = {
      success: result.success,
      move: result.move,
      gameState: result.newGameState, // Map newGameState to gameState
      error: result.error
    };
    
    console.log('🔄 [GAME_LOBBY] Mapped result:', {
      success: mappedResult.success,
      hasMove: !!mappedResult.move,
      hasGameState: !!mappedResult.gameState,
      error: mappedResult.error
    });
    
    return mappedResult;
  }

  /**
   * Get valid moves for a piece
   */
  public getValidMoves(gameId: string, row: number, col: number, playerAddress: string): { success: boolean; validMoves?: { row: number; col: number }[]; error?: string } {
    const game = this.games.get(gameId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.state !== GameState.STARTED) {
      return { success: false, error: 'Game is not active' };
    }

    if (!game.chessState) {
      return { success: false, error: 'Chess state not initialized' };
    }

    // Check if it's the player's turn
    const isOwner = game.owner.toLowerCase() === playerAddress.toLowerCase();
    const isOpponent = game.opponent && game.opponent.toLowerCase() === playerAddress.toLowerCase();
    
    if (!isOwner && !isOpponent) {
      return { success: false, error: 'You are not a player in this game' };
    }

    const playerColor = isOwner ? 'white' : 'black';
    if (game.chessState.currentPlayer !== playerColor) {
      return { success: false, error: 'Not your turn' };
    }

    const chessEngine = ChessEngine.getInstance();
    const validMoves = chessEngine.getValidMoves(game.chessState, row, col);

    return { success: true, validMoves };
  }

  /**
   * Delete a game (for cleanup)
   */
  public deleteGame(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  /**
   * Get game statistics
   */
  public getStats(): {
    total: number;
    created: number;
    started: number;
    settled: number;
  } {
    const games = Array.from(this.games.values());
    return {
      total: games.length,
      created: games.filter(g => g.state === GameState.CREATED).length,
      started: games.filter(g => g.state === GameState.STARTED).length,
      settled: games.filter(g => g.state === GameState.SETTLED).length
    };
  }

  /**
   * Settle a game on the escrow contract when checkmate occurs
   * @param gameId - The game ID to settle
   * @param winner - The winner ('white' or 'black')
   * @param chainId - The chain ID to submit the transaction on
   */
  private async settleGameOnEscrow(gameId: string, winner: 'white' | 'black', chainId?: number): Promise<void> {
    try {
      console.log('🎯 [GAME_LOBBY] Starting escrow settlement for game:', {
        gameId,
        winner,
        chainId
      });

      if (!chainId) {
        console.log('❌ [GAME_LOBBY] No chainId provided for escrow settlement');
        return;
      }

      const game = this.games.get(gameId);
      if (!game) {
        console.log('❌ [GAME_LOBBY] Game not found for escrow settlement');
        return;
      }

      // Determine the winner's address
      const winnerAddress = winner === 'white' ? game.owner : game.opponent;
      if (!winnerAddress) {
        console.log('❌ [GAME_LOBBY] Winner address not found for escrow settlement');
        return;
      }

      console.log('🏆 [GAME_LOBBY] Winner determined:', {
        winner,
        winnerAddress,
        gameOwner: game.owner,
        gameOpponent: game.opponent
      });

      // Import BlockchainService and settle the game
      const { BlockchainService } = require('./BlockchainService');
      const blockchainService = BlockchainService.getInstance();
      
      const transactionHash = await blockchainService.settleGame(gameId, winnerAddress, chainId);
      
      console.log('✅ [GAME_LOBBY] Game settled on escrow contract:', {
        gameId,
        winner,
        winnerAddress,
        transactionHash
      });

      // Update game with settlement transaction hash
      if (!game.escrow) {
        game.escrow = {
          contractAddress: '',
          transactionHash: '',
          blockNumber: 0
        };
      }
      game.escrow.settlementTransactionHash = transactionHash;

    } catch (error) {
      console.error('❌ [GAME_LOBBY] Error settling game on escrow contract:', error);
      // Don't throw the error - we don't want to break the game flow if settlement fails
    }
  }
}
