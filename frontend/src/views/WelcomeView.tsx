import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from '../state/GameStateManager';
import { AuthButton } from '../components/AuthButton';

export const WelcomeView: React.FC = () => {
  const { user } = usePrivy();
  const { state, dispatch } = useGameState();

  const userAddress = user?.wallet?.address || (state.type === 'MENU' ? state.userAddress : undefined);

  const handleBrowseGames = () => {
    if (userAddress) {
      dispatch({ type: 'NAVIGATE_TO_BROWSE_GAMES', userAddress });
    }
  };

  const handleCreateGame = () => {
    if (userAddress) {
      dispatch({ type: 'NAVIGATE_TO_CREATE_GAME', userAddress });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Zugzwang</h1>
          <p className="text-gray-600 mb-2">You are successfully connected!</p>
          {userAddress && (
            <p className="text-sm text-gray-500 font-mono break-all">
              {userAddress}
            </p>
          )}
        </div>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={handleBrowseGames}
            className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            Browse Games
          </button>
          
          <button
            onClick={handleCreateGame}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Create Game
          </button>
        </div>
        
        <div className="mb-6">
          <AuthButton />
        </div>
        
        {state.isLoading && (
          <div className="text-blue-500 text-sm">
            Processing...
          </div>
        )}
      </div>
    </div>
  );
};
