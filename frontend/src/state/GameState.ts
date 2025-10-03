export enum GameStateType {
  LOGIN = 'LOGIN',
  MENU = 'MENU'
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

export type GameState = LogInState | MenuState;

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
