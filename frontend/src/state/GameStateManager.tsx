import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, GameStateType, createLogInState, createMenuState, createBrowseGamesState, createCreateGameState, CreateGameState } from './GameState';

interface GameStateContextType {
  state: GameState;
  dispatch: React.Dispatch<GameStateAction>;
}

type GameStateAction =
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'LOGIN_SUCCESS'; userAddress: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'NAVIGATE_TO_BROWSE_GAMES'; userAddress: string }
  | { type: 'NAVIGATE_TO_CREATE_GAME'; userAddress: string }
  | { type: 'NAVIGATE_TO_MENU'; userAddress: string }
  | { type: 'UPDATE_WAGER_AMOUNT'; wagerAmount: string }
  | { type: 'UPDATE_OPPONENT_ADDRESS'; opponentAddress: string }
  | { type: 'VALIDATE_FORM' };

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

const gameStateReducer = (state: GameState, action: GameStateAction): GameState => {
  switch (action.type) {
    case 'SET_LOADING':
      if (state.type === GameStateType.LOGIN) {
        return createLogInState(action.isLoading, state.error);
      } else if (state.type === GameStateType.MENU) {
        return createMenuState(state.userAddress, action.isLoading);
      } else if (state.type === GameStateType.BROWSE_GAMES) {
        return createBrowseGamesState(state.userAddress, action.isLoading, state.games, state.error);
      } else if (state.type === GameStateType.CREATE_GAME) {
        return createCreateGameState(state.userAddress, action.isLoading, state.wagerAmount, state.opponentAddress, state.isFormValid, state.error);
      }
      return state;
    
    case 'SET_ERROR':
      if (state.type === GameStateType.LOGIN) {
        return createLogInState(state.isLoading, action.error);
      } else if (state.type === GameStateType.BROWSE_GAMES) {
        return createBrowseGamesState(state.userAddress, state.isLoading, state.games, action.error);
      } else if (state.type === GameStateType.CREATE_GAME) {
        return createCreateGameState(state.userAddress, state.isLoading, state.wagerAmount, state.opponentAddress, state.isFormValid, action.error);
      }
      return state;
    
    case 'LOGIN_SUCCESS':
      return createMenuState(action.userAddress, false);
    
    case 'LOGOUT':
      return createLogInState(false);
    
    case 'CLEAR_ERROR':
      if (state.type === GameStateType.LOGIN) {
        return createLogInState(state.isLoading);
      } else if (state.type === GameStateType.BROWSE_GAMES) {
        return createBrowseGamesState(state.userAddress, state.isLoading, state.games);
      } else if (state.type === GameStateType.CREATE_GAME) {
        return createCreateGameState(state.userAddress, state.isLoading, state.wagerAmount, state.opponentAddress, state.isFormValid);
      }
      return state;
    
    case 'NAVIGATE_TO_BROWSE_GAMES':
      return createBrowseGamesState(action.userAddress, false);
    
    case 'NAVIGATE_TO_CREATE_GAME':
      return createCreateGameState(action.userAddress, false);
    
    case 'NAVIGATE_TO_MENU':
      return createMenuState(action.userAddress, false);
    
    case 'UPDATE_WAGER_AMOUNT':
      if (state.type === GameStateType.CREATE_GAME) {
        const newState = createCreateGameState(state.userAddress, state.isLoading, action.wagerAmount, state.opponentAddress, false, state.error);
        // Validate form after updating wager
        return validateCreateGameForm(newState);
      }
      return state;
    
    case 'UPDATE_OPPONENT_ADDRESS':
      if (state.type === GameStateType.CREATE_GAME) {
        const newState = createCreateGameState(state.userAddress, state.isLoading, state.wagerAmount, action.opponentAddress, false, state.error);
        // Validate form after updating opponent address
        return validateCreateGameForm(newState);
      }
      return state;
    
    case 'VALIDATE_FORM':
      if (state.type === GameStateType.CREATE_GAME) {
        return validateCreateGameForm(state);
      }
      return state;
    
    default:
      return state;
  }
};

// Helper function to validate create game form
const validateCreateGameForm = (state: CreateGameState): CreateGameState => {
  const minWager = 0.0001; // 0.0001 ETH minimum
  const wagerAmount = parseFloat(state.wagerAmount);
  
  const isWagerValid = !isNaN(wagerAmount) && wagerAmount >= minWager;
  const isOpponentValid = state.opponentAddress === '' || /^0x[a-fA-F0-9]{40}$/.test(state.opponentAddress);
  
  const isFormValid = isWagerValid && isOpponentValid;
  
  return createCreateGameState(
    state.userAddress,
    state.isLoading,
    state.wagerAmount,
    state.opponentAddress,
    isFormValid,
    state.error
  );
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
