export enum GameState {
  CREATED = 'CREATED',
  STARTED = 'STARTED',
  SETTLED = 'SETTLED'
}

export interface Game {
  id: string;
  owner: string; // Ethereum address
  opponent: string | null; // Ethereum address or null for open games
  wager: bigint; // Amount in wei
  state: GameState;
  createdAt: Date;
  startedAt?: Date;
  settledAt?: Date;
}

export interface GameResponse {
  id: string;
  owner: string;
  opponent: string | null;
  wager: string; // Serialized as string for JSON
  state: GameState;
  createdAt: string; // ISO string
  startedAt?: string;
  settledAt?: string;
}

export interface CreateGameRequest {
  owner: string;
  opponent?: string; // Optional required opponent
  wager: string; // Wager amount as string (will be converted to BigInt)
}

export interface JoinGameRequest {
  gameId: string;
  opponent: string;
}

export interface GameApiResponse {
  success: boolean;
  data?: GameResponse;
  error?: string;
}

export interface GamesListApiResponse {
  success: boolean;
  data?: GameResponse[];
  error?: string;
}

// Utility function to serialize Game to GameResponse
export function serializeGame(game: Game): GameResponse {
  return {
    id: game.id,
    owner: game.owner,
    opponent: game.opponent,
    wager: game.wager.toString(),
    state: game.state,
    createdAt: game.createdAt.toISOString(),
    startedAt: game.startedAt?.toISOString(),
    settledAt: game.settledAt?.toISOString()
  };
}
