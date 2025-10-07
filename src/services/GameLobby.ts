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

    // Determine player color
    const playerColor = isOwner ? 'white' : 'black';
    if (game.chessState.currentPlayer !== playerColor) {
      return { success: false, error: 'Not your turn' };
    }

    // Make the move
    const chessEngine = ChessEngine.getInstance();
    const result = chessEngine.makeMove(game.chessState, fromRow, fromCol, toRow, toCol, promotionPiece as any);
    
    if (result.success && result.newGameState) {
      game.chessState = result.newGameState;
      this.games.set(gameId, game);
    }

    return result;
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
