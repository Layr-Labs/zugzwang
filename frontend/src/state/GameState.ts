export enum GameStateType {
  LOGIN = 'LOGIN',
  MENU = 'MENU',
  BROWSE_GAMES = 'BROWSE_GAMES',
  CREATE_GAME = 'CREATE_GAME',
  ARENA_GAME = 'ARENA_GAME',
  GAME_HISTORY = 'GAME_HISTORY'
}

export interface LogInState {
  type: GameStateType.LOGIN;
  isLoading: boolean;
  error?: string;
}

export interface MenuState {
  type: GameStateType.MENU;
  userAddress?: string;
  isLoading: boolean;
}

export interface BrowseGamesState {
  type: GameStateType.BROWSE_GAMES;
  userAddress?: string;
  isLoading: boolean;
  games?: any[];
  error?: string;
  highlightGameId?: string;
}

export interface CreateGameState {
  type: GameStateType.CREATE_GAME;
  userAddress?: string;
  isLoading: boolean;
  wagerAmount: string;
  opponentAddress: string;
  isFormValid: boolean;
  error?: string;
}

export interface ArenaGameState {
  type: GameStateType.ARENA_GAME;
  gameId: string;
  userAddress?: string;
  opponentAddress?: string;
  wagerAmount: string;
  networkType?: string;
  chainId?: number;
  isOwner: boolean;
  isLoading: boolean;
  error?: string;
}

export interface GameHistoryState {
  type: GameStateType.GAME_HISTORY;
  userAddress?: string;
  isLoading: boolean;
  error?: string;
}

export type GameState = LogInState | MenuState | BrowseGamesState | CreateGameState | ArenaGameState | GameHistoryState;

export const createLogInState = (isLoading: boolean = false, error?: string): LogInState => ({
  type: GameStateType.LOGIN,
  isLoading,
  error
});

export const createMenuState = (userAddress?: string, isLoading: boolean = false): MenuState => ({
  type: GameStateType.MENU,
  userAddress,
  isLoading
});

export const createBrowseGamesState = (userAddress?: string, isLoading: boolean = false, games?: any[], error?: string, highlightGameId?: string): BrowseGamesState => ({
  type: GameStateType.BROWSE_GAMES,
  userAddress,
  isLoading,
  games,
  error,
  highlightGameId
});

export const createCreateGameState = (userAddress?: string, isLoading: boolean = false, wagerAmount: string = '', opponentAddress: string = '', isFormValid: boolean = false, error?: string): CreateGameState => ({
  type: GameStateType.CREATE_GAME,
  userAddress,
  isLoading,
  wagerAmount,
  opponentAddress,
  isFormValid,
  error
});

export const createArenaGameState = (gameId: string, userAddress?: string, opponentAddress?: string, wagerAmount: string = '', networkType?: string, chainId?: number, isOwner: boolean = false, isLoading: boolean = false, error?: string): ArenaGameState => ({
  type: GameStateType.ARENA_GAME,
  gameId,
  userAddress,
  opponentAddress,
  wagerAmount,
  networkType,
  chainId,
  isOwner,
  isLoading,
  error
});

export const createGameHistoryState = (userAddress?: string, isLoading: boolean = false, error?: string): GameHistoryState => ({
  type: GameStateType.GAME_HISTORY,
  userAddress,
  isLoading,
  error
});
