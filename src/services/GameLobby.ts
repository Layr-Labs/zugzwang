import { Game, GameState } from '../types/Game';
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
   * Create a new game
   */
  public createGame(owner: string, opponent: string | null, wager: string): Game {
    const gameId = randomUUID();
    const wagerBigInt = BigInt(wager);
    
    const game: Game = {
      id: gameId,
      owner,
      opponent,
      wager: wagerBigInt,
      state: GameState.CREATED,
      createdAt: new Date()
    };

    this.games.set(gameId, game);
    return game;
  }

  /**
   * Join an existing game
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
    return Array.from(this.games.values()).filter(game => game.owner === owner);
  }

  /**
   * Get games by opponent
   */
  public getGamesByOpponent(opponent: string): Game[] {
    return Array.from(this.games.values()).filter(game => game.opponent === opponent);
  }

  /**
   * Get open games (CREATED state with no required opponent)
   */
  public getOpenGames(): Game[] {
    return Array.from(this.games.values()).filter(
      game => game.state === GameState.CREATED && game.opponent === null
    );
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
   * Get chess game state for a game
   */
  public getChessGameState(gameId: string): any | null {
    const game = this.games.get(gameId);
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
}
