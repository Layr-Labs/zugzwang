import React, { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from '../state/GameStateManager';

export const BrowseGamesView: React.FC = () => {
  const { user } = usePrivy();
  const { state, dispatch } = useGameState();

  const userAddress = user?.wallet?.address || (state.type === 'BROWSE_GAMES' ? state.userAddress : undefined);

  useEffect(() => {
    // TODO: Fetch games from API
    // For now, we'll just show a placeholder
  }, []);

  const handleBackToMenu = () => {
    if (userAddress) {
      dispatch({ type: 'NAVIGATE_TO_MENU', userAddress });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">Browse Games</h1>
            <button
              onClick={handleBackToMenu}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Back to Menu
            </button>
          </div>
          <p className="text-gray-600">Find games to join or view your active games</p>
          {userAddress && (
            <p className="text-sm text-gray-500 font-mono break-all mt-2">
              Connected as: {userAddress}
            </p>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-100 p-6 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Open Games</h3>
            <p className="text-gray-500">Games waiting for opponents</p>
            {/* TODO: Display actual games from API */}
            <div className="mt-4 text-sm text-gray-400">
              No open games found
            </div>
          </div>
          
          <div className="bg-gray-100 p-6 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Games</h3>
            <p className="text-gray-500">Games you've created or joined</p>
            {/* TODO: Display user's games from API */}
            <div className="mt-4 text-sm text-gray-400">
              No games found
            </div>
          </div>
        </div>
        
        {state.isLoading && (
          <div className="text-center text-blue-500 text-sm mt-4">
            Loading games...
          </div>
        )}
      </div>
    </div>
  );
};
