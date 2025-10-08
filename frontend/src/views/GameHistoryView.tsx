import React, { useState, useEffect } from 'react';
import { useGameState } from '../state/GameStateManager';
import { useApiClient } from '../services/api';

interface Game {
  id: string;
  owner: string;
  opponent: string | null;
  wager: string;
  state: 'CREATED' | 'STARTED' | 'SETTLED';
  createdAt: string;
  startedAt?: string;
  settledAt?: string;
  winner?: 'white' | 'black';
}

interface GameHistoryViewProps {}

const GameHistoryView: React.FC<GameHistoryViewProps> = () => {
  const { state, dispatch } = useGameState();
  const apiClient = useApiClient();
  const [settledGames, setSettledGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.type === 'GAME_HISTORY' && 'userAddress' in state && state.userAddress) {
      fetchSettledGames();
    }
  }, [state.type, 'userAddress' in state ? state.userAddress : undefined]);

  const fetchSettledGames = async () => {
    if (!('userAddress' in state) || !state.userAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 [GAME_HISTORY] Fetching settled games for user:', state.userAddress.substring(0, 8) + '...');
      const response = await apiClient.getSettledGames(state.userAddress);
      
      console.log('📊 [GAME_HISTORY] Settled games response:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length || 0,
        error: response.error
      });
      
      if (response.success && response.data) {
        setSettledGames(response.data);
        console.log('✅ [GAME_HISTORY] Settled games loaded successfully');
      } else {
        console.error('❌ [GAME_HISTORY] Failed to load settled games:', response.error);
        setError(response.error || 'Failed to load game history');
      }
    } catch (err) {
      console.error('💥 [GAME_HISTORY] Exception loading settled games:', err);
      setError('Failed to load game history');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToBrowse = () => {
    if ('userAddress' in state && state.userAddress) {
      dispatch({ type: 'NAVIGATE_TO_BROWSE_GAMES', userAddress: state.userAddress });
    }
  };

  const formatWager = (wagerAmount: string) => {
    const wager = BigInt(wagerAmount);
    const eth = Number(wager) / 1e18;
    return `${eth.toFixed(4)} ETH`;
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getGameResult = (game: Game) => {
    if (!game.winner) return 'Draw';
    if (!('userAddress' in state) || !state.userAddress) return 'Unknown';
    if (game.winner === 'white') {
      return game.owner === state.userAddress ? 'You Won' : 'You Lost';
    } else {
      return game.opponent === state.userAddress ? 'You Won' : 'You Lost';
    }
  };

  const getResultColor = (game: Game) => {
    if (!game.winner) return 'text-gray-600';
    if (!('userAddress' in state) || !state.userAddress) return 'text-gray-600';
    if (game.winner === 'white') {
      return game.owner === state.userAddress ? 'text-green-600' : 'text-red-600';
    } else {
      return game.opponent === state.userAddress ? 'text-green-600' : 'text-red-600';
    }
  };

  if (state.type !== 'GAME_HISTORY') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Game History</h1>
          <button
            onClick={handleBackToBrowse}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Back to Browse Games
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading game history...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 text-sm">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Game History */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {settledGames.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Games Yet</h3>
                <p className="text-gray-500">You haven't completed any games yet. Start playing to see your history here!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Game ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opponent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {settledGames.map((game) => (
                      <tr key={game.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {game.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {game.opponent ? formatAddress(game.opponent) : 'Open Game'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatWager(game.wager)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${getResultColor(game)}`}>
                            {getGameResult(game)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(game.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Stats Summary */}
        {!loading && !error && settledGames.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-green-600 text-2xl mr-3">🏆</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {settledGames.filter(game => getGameResult(game) === 'You Won').length}
                  </div>
                  <div className="text-sm text-gray-500">Wins</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-red-600 text-2xl mr-3">💔</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {settledGames.filter(game => getGameResult(game) === 'You Lost').length}
                  </div>
                  <div className="text-sm text-gray-500">Losses</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-gray-600 text-2xl mr-3">🤝</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {settledGames.filter(game => getGameResult(game) === 'Draw').length}
                  </div>
                  <div className="text-sm text-gray-500">Draws</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHistoryView;
