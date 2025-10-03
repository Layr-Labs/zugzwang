import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, GameStateType, createLogInState, createMenuState } from './GameState';

interface GameStateContextType {
  state: GameState;
  dispatch: React.Dispatch<GameStateAction>;
}

type GameStateAction =
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'LOGIN_SUCCESS'; userAddress: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

const gameStateReducer = (state: GameState, action: GameStateAction): GameState => {
  switch (action.type) {
    case 'SET_LOADING':
      if (state.type === GameStateType.LOGIN) {
        return createLogInState(action.isLoading, state.error);
      }
      return createMenuState(state.userAddress, action.isLoading);
    
    case 'SET_ERROR':
      if (state.type === GameStateType.LOGIN) {
        return createLogInState(state.isLoading, action.error);
      }
      return state;
    
    case 'LOGIN_SUCCESS':
      return createMenuState(action.userAddress, false);
    
    case 'LOGOUT':
      return createLogInState(false);
    
    case 'CLEAR_ERROR':
      if (state.type === GameStateType.LOGIN) {
        return createLogInState(state.isLoading);
      }
      return state;
    
    default:
      return state;
  }
};

interface GameStateProviderProps {
  children: ReactNode;
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(gameStateReducer, createLogInState());

  return (
    <GameStateContext.Provider value={{ state, dispatch }}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = (): GameStateContextType => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
