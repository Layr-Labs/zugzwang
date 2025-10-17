import React, { useEffect, useState, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from '../state/GameStateManager';
import { useApiClient } from '../services/api';
import { useEscrowContract } from '../services/escrowContract';
import { Game } from '../types/Game';
import { getChainName } from '../config/chains';

interface GameData {
  openGames: Game[];
  userGames: Game[];
  gameInvitations: Game[];
  activeGames: Game[];
}

export const BrowseGamesView: React.FC = () => {
  const { user } = usePrivy();
  const { state, dispatch } = useGameState();
  const apiClient = useApiClient();
  const escrowContract = useEscrowContract();

  // Extract wallet address from user's linked accounts
  const walletAccount = user?.linkedAccounts?.find(
    (account) => account.type === 'wallet'
  ) as { address: string; type: 'wallet' } | undefined;
  const userAddress = walletAccount?.address || (state.type === 'BROWSE_GAMES' ? state.userAddress : undefined);
  
  console.log('🔍 BROWSE GAMES DEBUG - User object:', user);
  console.log('🔍 BROWSE GAMES DEBUG - User wallet address:', user?.wallet?.address);
  console.log('🔍 BROWSE GAMES DEBUG - User linked accounts:', user?.linkedAccounts);
  console.log('🔍 BROWSE GAMES DEBUG - Wallet account found:', walletAccount);
  console.log('🔍 BROWSE GAMES DEBUG - State user address:', state.type === 'BROWSE_GAMES' ? state.userAddress : undefined);
  console.log('🔍 BROWSE GAMES DEBUG - Final user address:', userAddress);
  console.log('🔍 BROWSE GAMES DEBUG - User address length:', userAddress?.length);
  
  const [gameData, setGameData] = useState<GameData>({
    openGames: [],
    userGames: [],
    gameInvitations: [],
    activeGames: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedGameId, setHighlightedGameId] = useState<string | null>(null);
  const highlightedGameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userAddress) {
      fetchAllGames();
    }
  }, [userAddress]);

  // Handle game highlighting from state
  useEffect(() => {
    if (state.type === 'BROWSE_GAMES' && state.highlightGameId) {
      setHighlightedGameId(state.highlightGameId);
      
      // Scroll to the highlighted game after a short delay to ensure it's rendered
      const scrollTimer = setTimeout(() => {
        if (highlightedGameRef.current) {
          highlightedGameRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100);
      
      // Clear highlight after animation completes (3 seconds)
      const clearTimer = setTimeout(() => {
        setHighlightedGameId(null);
      }, 3000);
      
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [state]);

  // Add polling every 5 seconds (disabled for now to debug)
  // useEffect(() => {
  //   if (!userAddress) return;

  //   const interval = setInterval(() => {
  //     console.log('🔍 BROWSE GAMES DEBUG - Polling for games...');
  //     fetchAllGames();
  //   }, 5000); // Poll every 5 seconds

  //   return () => clearInterval(interval);
  // }, [userAddress]);

  const handleBackToMenu = () => {
    if (userAddress) {
      dispatch({ type: 'NAVIGATE_TO_MENU', userAddress });
    }
  };

  const handleJoinGame = async (gameId: string, wagerAmount: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use escrow contract to join game
      const result = await escrowContract.joinGame(gameId, wagerAmount);
      
      if (result.success) {
        console.log('✅ [JOIN_GAME] Game joined successfully:', {
          gameId,
          transactionHash: result.transactionHash
        });
        
        // Refresh games after joining
        await fetchAllGames();
      } else {
        throw new Error(result.error || 'Failed to join game');
      }
    } catch (err) {
      console.error('❌ [JOIN_GAME] Failed to join game:', err);
      
      // Handle different types of errors with better user messages
      let errorMessage = 'Failed to join game';
      if (err instanceof Error) {
        if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for wager amount';
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (gameId: string, wagerAmount: string) => {
    if (!userAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('🎯 [FRONTEND] Accepting game invitation via joinGame:', { gameId, wagerAmount });
      
      // Use the same joinGame flow as regular join
      const result = await escrowContract.joinGame(gameId, wagerAmount);
      
      if (result.success) {
        console.log('✅ [ACCEPT_INVITATION] Game invitation accepted successfully:', {
          gameId,
          transactionHash: result.transactionHash
        });
        
        // Refresh games after accepting invitation
        await fetchAllGames();
      } else {
        throw new Error(result.error || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('❌ [ACCEPT_INVITATION] Failed to accept invitation:', err);
      
      // Handle different types of errors with better user messages
      let errorMessage = 'Failed to accept invitation';
      if (err instanceof Error) {
        if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for wager amount';
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGames = async () => {
    if (!userAddress) {
      console.log('🔍 BROWSE GAMES DEBUG - No user address, skipping fetch');
      return;
    }
    
    console.log('🔍 BROWSE GAMES DEBUG - Fetching games for user:', userAddress);
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all game data in parallel
      console.log('🔍 BROWSE GAMES DEBUG - Starting parallel fetch...');
      console.log('🔍 BROWSE GAMES DEBUG - User address being sent to getUserGames:', userAddress);
      const [openGamesRes, userGamesRes, gameInvitationsRes, activeGamesRes] = await Promise.all([
        apiClient.getOpenGames(userAddress), // Pass userAddress to exclude owner's games
        apiClient.getUserGames(userAddress),
        apiClient.getGameInvitations(userAddress), // Use new invitations endpoint
        apiClient.getActiveGames(userAddress)
      ]);
      
      console.log('🔍 BROWSE GAMES DEBUG - Open games response:', openGamesRes);
      console.log('🔍 BROWSE GAMES DEBUG - User games response:', userGamesRes);
      console.log('🔍 BROWSE GAMES DEBUG - Game invitations response:', gameInvitationsRes);
      console.log('🔍 BROWSE GAMES DEBUG - Active games response:', activeGamesRes);
      
      const newGameData = {
        openGames: openGamesRes.data || [],
        userGames: userGamesRes.data || [],
        gameInvitations: gameInvitationsRes.data || [],
        activeGames: activeGamesRes.data || []
      };
      
      console.log('🔍 BROWSE GAMES DEBUG - Setting game data:', newGameData);
      console.log('🔍 BROWSE GAMES DEBUG - User address for comparison:', userAddress);
      console.log('🔍 BROWSE GAMES DEBUG - Open games before filtering:', newGameData.openGames);
      console.log('🔍 BROWSE GAMES DEBUG - User games before filtering:', newGameData.userGames);
      setGameData(newGameData);
    } catch (err) {
      console.error('🔍 BROWSE GAMES DEBUG - Failed to fetch games:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAllGames();
  };

  const handlePlayGame = (game: Game) => {
    if (!userAddress) return;
    
    const isOwner = game.owner.toLowerCase() === userAddress.toLowerCase();
    const opponentAddress = isOwner ? game.opponent : game.owner;
    
    dispatch({
      type: 'NAVIGATE_TO_ARENA_GAME',
      gameId: game.id,
      userAddress,
      opponentAddress: opponentAddress || undefined,
      wagerAmount: game.wager.toString(),
      networkType: game.networkType,
      chainId: game.chainId,
      isOwner
    });
  };

  // Helper functions to display games - no client-side filtering
  const getOpenGames = () => {
    console.log('🔍 BROWSE GAMES DEBUG - Open games:', gameData.openGames);
    return gameData.openGames;
  };

  const getYourGames = () => {
    console.log('🔍 BROWSE GAMES DEBUG - Your games:', gameData.userGames);
    console.log('🔍 BROWSE GAMES DEBUG - User address for comparison:', userAddress);
    console.log('🔍 BROWSE GAMES DEBUG - Your games count:', gameData.userGames.length);
    if (gameData.userGames.length > 0) {
      console.log('🔍 BROWSE GAMES DEBUG - First game owner:', gameData.userGames[0].owner);
      console.log('🔍 BROWSE GAMES DEBUG - Owner match:', gameData.userGames[0].owner.toLowerCase() === userAddress?.toLowerCase());
    }
    return gameData.userGames;
  };

  const getGameInvitations = () => {
    console.log('🔍 BROWSE GAMES DEBUG - Game invitations:', gameData.gameInvitations);
    return gameData.gameInvitations;
  };

  const getActiveGames = () => {
    console.log('🔍 BROWSE GAMES DEBUG - Active games:', gameData.activeGames);
    return gameData.activeGames;
  };

  const formatWager = (wager: string) => {
    try {
      const wagerBigInt = BigInt(wager);
      const ethAmount = wagerBigInt / BigInt(1e18);
      const weiRemainder = wagerBigInt % BigInt(1e18);
      const decimalPart = weiRemainder.toString().padStart(18, '0').slice(0, 4);
      return `${ethAmount}.${decimalPart} ETH`;
    } catch (error) {
      console.error('Error formatting wager:', error);
      return 'Invalid wager';
    }
  };

  const formatNetwork = (game: Game) => {
    console.log('🔍 FORMAT NETWORK DEBUG - Game:', {
      id: game.id,
      networkType: game.networkType,
      chainId: game.chainId
    });
    
    // Handle cases where networkType or chainId might be missing (legacy games)
    if (!game.networkType) {
      console.log('🔍 FORMAT NETWORK DEBUG - No networkType, returning Legacy');
      return 'Legacy (Unknown Network)';
    }
    
    const networkName = getChainName(game.networkType, game.chainId);
    console.log('🔍 FORMAT NETWORK DEBUG - Network name:', networkName);
    
    // Ensure we always return a non-empty string
    return networkName || 'Unknown Network';
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">Browse Games</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => dispatch({ type: 'SET_GAME_HISTORY' })}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Game History
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleBackToMenu}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
          <p className="text-gray-600">Find games to join or view your active games</p>
          {userAddress && (
            <p className="text-sm text-gray-500 font-mono break-all mt-2">
              Connected as: {userAddress}
            </p>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Open Games */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Open Games</h3>
            <p className="text-gray-500 mb-4">Games waiting for opponents</p>
            {loading ? (
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading open games...
              </div>
            ) : getOpenGames().length === 0 ? (
              <div className="text-center text-gray-400">No open games found</div>
            ) : (
              <div className="space-y-3">
                {getOpenGames().map((game) => (
                  <div 
                    key={game.id} 
                    ref={highlightedGameId === game.id ? highlightedGameRef : null}
                    className={`bg-white p-4 rounded border flex justify-between items-center ${
                      highlightedGameId === game.id ? 'game-highlight' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium">Wager: {formatWager(game.wager)}</div>
                      <div className="text-sm text-gray-500">
                        Created by {formatAddress(game.owner)} • {formatDate(game.createdAt)}
                      </div>
                      <div className="text-sm text-blue-600">
                        Network: {formatNetwork(game) || 'Unknown'}
                      </div>
                      {game.opponent && (
                        <div className="text-sm text-blue-600">
                          Invited: {formatAddress(game.opponent)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleJoinGame(game.id, game.wager)}
                      disabled={loading}
                      className={`px-4 py-2 rounded transition-colors ${
                        loading
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {loading ? 'Joining...' : 'Join Game'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Active Games */}
          <div className="bg-green-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Active Games</h3>
            <p className="text-gray-500 mb-4">Games currently in progress</p>
            {loading ? (
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading active games...
              </div>
            ) : getActiveGames().length === 0 ? (
              <div className="text-center text-gray-400">No active games found</div>
            ) : (
              <div className="space-y-3">
                {getActiveGames().map((game) => (
                  <div key={game.id} className="bg-white p-4 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Wager: {formatWager(game.wager)}</div>
                        <div className="text-sm text-gray-500">
                          {game.owner.toLowerCase() === userAddress?.toLowerCase() ? 'You vs' : 'vs You'} {formatAddress(game.opponent || game.owner)} • Started {formatDate(game.startedAt || game.createdAt)}
                        </div>
                        <div className="text-sm text-blue-600">
                          Network: {formatNetwork(game) || 'Unknown'}
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          Game ID: {game.id.substring(0, 8)}...
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 mb-2">
                          {game.state}
                        </div>
                        <button
                          onClick={() => handlePlayGame(game)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                        >
                          PLAY GAME
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Game Invitations */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Game Invitations</h3>
            <p className="text-gray-500 mb-4">Games where you're invited as opponent</p>
            {loading ? (
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading invitations...
              </div>
            ) : getGameInvitations().length === 0 ? (
              <div className="text-center text-gray-400">No invitations found</div>
            ) : (
              <div className="space-y-3">
                {getGameInvitations().map((game) => (
                  <div key={game.id} className="bg-white p-4 rounded border flex justify-between items-center">
                    <div>
                      <div className="font-medium">Wager: {formatWager(game.wager)}</div>
                      <div className="text-sm text-gray-500">
                        Invited by {formatAddress(game.owner)} • {formatDate(game.createdAt)}
                      </div>
                      <div className="text-sm text-blue-600">
                        Network: {formatNetwork(game)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptInvitation(game.id, game.wager)}
                      disabled={loading}
                      className={`px-4 py-2 rounded transition-colors ${
                        loading
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {loading ? 'Accepting...' : 'Accept Invitation'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Your Games */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Your Games</h3>
            <p className="text-gray-500 mb-4">Games you've created or joined</p>
            {loading ? (
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading your games...
              </div>
            ) : getYourGames().length === 0 ? (
              <div className="text-center text-gray-400">No games found</div>
            ) : (
              <div className="space-y-3">
                {getYourGames().map((game) => (
                  <div 
                    key={game.id} 
                    ref={highlightedGameId === game.id ? highlightedGameRef : null}
                    className={`bg-white p-4 rounded border ${
                      highlightedGameId === game.id ? 'game-highlight' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Wager: {formatWager(game.wager)}</div>
                        <div className="text-sm text-gray-500">
                          You created • {formatDate(game.createdAt)}
                        </div>
                        <div className="text-sm text-blue-600">
                          Network: {formatNetwork(game) || 'Unknown'}
                        </div>
                        {game.opponent ? (
                          <div className="text-sm text-blue-600">
                            Invited: {formatAddress(game.opponent)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Waiting for opponent
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          game.state === 'CREATED' ? 'bg-yellow-100 text-yellow-800' :
                          game.state === 'STARTED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {game.state}
                        </div>
                        {game.startedAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Started: {formatDate(game.startedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
