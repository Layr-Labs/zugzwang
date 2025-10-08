export enum GameState {
  CREATED = 'CREATED',    // Open game waiting for any opponent to join
  WAITING = 'WAITING',    // Game with specific opponent invited, waiting for acceptance
  STARTED = 'STARTED',    // Game in progress
  SETTLED = 'SETTLED'     // Game completed
}

export enum NetworkType {
  EVM = 'EVM',
  SOL = 'SOL'
}

import { ChessGameState } from './Chess';

export interface Game {
  id: string;
  owner: string; // Ethereum address
  opponent: string | null; // Ethereum address or null for open games
  wager: bigint; // Amount in wei
  state: GameState;
  networkType: NetworkType; // EVM or SOL
  chainId?: number; // Chain ID for EVM networks, undefined for SOL
  createdAt: Date;
  startedAt?: Date;
  settledAt?: Date;
  chessState?: ChessGameState; // Chess game state when game is STARTED
  winner?: 'white' | 'black'; // Winner of the chess game when settled
}

export interface GameResponse {
  id: string;
  owner: string;
  opponent: string | null;
  wager: string; // Serialized as string for JSON
  state: GameState;
  networkType: NetworkType;
  chainId?: number;
  createdAt: string; // ISO string
  startedAt?: string;
  settledAt?: string;
  winner?: 'white' | 'black'; // Winner of the chess game when settled
}

export interface CreateGameRequest {
  opponent?: string; // Optional required opponent
  wagerAmount: string; // Wager amount in ETH as string (will be converted to BigInt wei)
  networkType: NetworkType; // EVM or SOL
  chainId?: number; // Chain ID for EVM networks
}

export interface JoinGameRequest {
  gameId: string;
}

export interface AcceptGameInvitationRequest {
  gameId: string;
  wagerAmount: string; // Wager amount in ETH as string (will be converted to BigInt wei)
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
    networkType: game.networkType,
    chainId: game.chainId,
    createdAt: game.createdAt.toISOString(),
    startedAt: game.startedAt?.toISOString(),
    settledAt: game.settledAt?.toISOString(),
    winner: game.winner
  };
}
