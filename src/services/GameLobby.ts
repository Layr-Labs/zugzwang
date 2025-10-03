import { Game, GameState, CreateGameRequest, JoinGameRequest } from '../types/Game';
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
  public createGame(request: CreateGameRequest): Game {
    const gameId = randomUUID();
    const wager = BigInt(request.wager);
    
    const game: Game = {
      id: gameId,
      owner: request.owner,
      opponent: request.opponent || null,
      wager,
      state: GameState.CREATED,
      createdAt: new Date()
    };

    this.games.set(gameId, game);
    return game;
  }

  /**
   * Join an existing game
   */
  public joinGame(request: JoinGameRequest): Game | null {
    const game = this.games.get(request.gameId);
    
    if (!game) {
      return null; // Game not found
    }

    if (game.state !== GameState.CREATED) {
      return null; // Game is not in CREATED state
    }

    // Check if there's a required opponent
    if (game.opponent && game.opponent !== request.opponent) {
      return null; // Wrong opponent
    }

    // Update game state
    game.opponent = request.opponent;
    game.state = GameState.STARTED;
    game.startedAt = new Date();

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
