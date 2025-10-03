import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from '../state/GameStateManager';
import { useApiClient } from '../services/api';

export const CreateGameView: React.FC = () => {
  const { user } = usePrivy();
  const { state, dispatch } = useGameState();
  const apiClient = useApiClient();

  const userAddress = user?.wallet?.address || (state.type === 'CREATE_GAME' ? state.userAddress : undefined);

  const handleWagerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'UPDATE_WAGER_AMOUNT', wagerAmount: e.target.value });
  };

  const handleOpponentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'UPDATE_OPPONENT_ADDRESS', opponentAddress: e.target.value });
  };

  const handleCreateGame = async () => {
    if (state.type === 'CREATE_GAME' && state.isFormValid) {
      try {
        dispatch({ type: 'SET_LOADING', isLoading: true });
        dispatch({ type: 'CLEAR_ERROR' });
        
        const game = await apiClient.createGame(
          state.wagerAmount,
          state.opponentAddress || undefined
        );
        
        console.log('Game created successfully:', game);
        // TODO: Navigate to game view or show success message
        
      } catch (error) {
        console.error('Failed to create game:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          error: error instanceof Error ? error.message : 'Failed to create game' 
        });
      } finally {
        dispatch({ type: 'SET_LOADING', isLoading: false });
      }
    }
  };

  const handleBackToMenu = () => {
    if (userAddress) {
      dispatch({ type: 'NAVIGATE_TO_MENU', userAddress });
    }
  };

  const getWagerError = () => {
    if (state.type === 'CREATE_GAME') {
      const wagerAmount = parseFloat(state.wagerAmount);
      if (state.wagerAmount && (isNaN(wagerAmount) || wagerAmount < 0.0001)) {
        return 'Wager must be at least 0.0001 ETH';
      }
    }
    return null;
  };

  const getOpponentError = () => {
    if (state.type === 'CREATE_GAME') {
      if (state.opponentAddress && !/^0x[a-fA-F0-9]{40}$/.test(state.opponentAddress)) {
        return 'Invalid Ethereum address format';
      }
    }
    return null;
  };

  if (state.type !== 'CREATE_GAME') {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">Create Game</h1>
            <button
              onClick={handleBackToMenu}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Back to Menu
            </button>
          </div>
          <p className="text-gray-600">Set up a new game with your wager and optional opponent</p>
          {userAddress && (
            <p className="text-sm text-gray-500 font-mono break-all mt-2">
              Creating as: {userAddress}
            </p>
          )}
        </div>
        
        <form className="space-y-6">
          <div>
            <label htmlFor="wager" className="block text-sm font-medium text-gray-700 mb-2">
              Wager Amount (ETH) *
            </label>
            <input
              type="number"
              id="wager"
              step="0.0001"
              min="0.0001"
              value={state.wagerAmount}
              onChange={handleWagerChange}
              placeholder="0.0001"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getWagerError() ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getWagerError() && (
              <p className="text-red-500 text-sm mt-1">{getWagerError()}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">Minimum: 0.0001 ETH</p>
          </div>
          
          <div>
            <label htmlFor="opponent" className="block text-sm font-medium text-gray-700 mb-2">
              Opponent Address (Optional)
            </label>
            <input
              type="text"
              id="opponent"
              value={state.opponentAddress}
              onChange={handleOpponentChange}
              placeholder="0x..."
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getOpponentError() ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getOpponentError() && (
              <p className="text-red-500 text-sm mt-1">{getOpponentError()}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Leave empty to allow anyone to join
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleCreateGame}
            disabled={!state.isFormValid || state.isLoading}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
              state.isFormValid && !state.isLoading
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {state.isLoading ? 'Creating...' : 'Create Game'}
          </button>
          
          {state.error && (
            <div className="text-red-500 text-sm text-center">
              {state.error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
