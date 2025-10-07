import React, { useState, useEffect } from 'react';
import { useGameState } from '../state/GameStateManager';
import { useApiClient } from '../services/api';
import ChessBoard, { ChessSquare } from '../components/chess/ChessBoard';
import { ChessGameState } from '../types/Chess';

export const ArenaGameView: React.FC = () => {
  const { state, dispatch } = useGameState();
  const apiClient = useApiClient();
  const [squares, setSquares] = useState<ChessSquare[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ row: number; col: number }[]>([]);
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGameState = async () => {
    if (state.type !== 'ARENA_GAME') return;
    
    const { gameId } = state;
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getChessGameState(gameId);
      
      if (response.success && response.data) {
        setGameState(response.data);
        setSquares(response.data.board);
      } else {
        setError(response.error || 'Failed to load game state');
      }
    } catch (err) {
      console.error('Failed to load game state:', err);
      setError('Failed to load game state');
    } finally {
      setLoading(false);
    }
  };

  // Load game state on component mount
  useEffect(() => {
    if (state.type === 'ARENA_GAME') {
      loadGameState();
    }
  }, [state.type, state.type === 'ARENA_GAME' ? state.gameId : null]);

  // Only render if we're in ARENA_GAME state
  if (state.type !== 'ARENA_GAME') {
    return null;
  }

  const { gameId, userAddress, opponentAddress, wagerAmount, isOwner } = state;

  const handleSquareClick = async (row: number, col: number) => {
    if (!gameState || !userAddress) return;

    // Check if it's the player's turn
    const playerColor = isOwner ? 'white' : 'black';
    if (gameState.currentPlayer !== playerColor) {
      console.log('Not your turn');
      return;
    }

    // If no square is selected, try to select this square
    if (!selectedSquare) {
      const square = squares[row][col];
      if (square.piece && square.piece.color === playerColor) {
        setSelectedSquare({ row, col });
        
        // Get valid moves for this piece
        try {
          const response = await apiClient.getValidMoves(gameId, row, col);
          if (response.success && response.validMoves) {
            setValidMoves(response.validMoves);
          }
        } catch (err) {
          console.error('Failed to get valid moves:', err);
        }
      }
      return;
    }

    // If a square is selected, try to make a move
    if (selectedSquare.row === row && selectedSquare.col === col) {
      // Deselect if clicking the same square
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Check if this is a valid move
    const isValidMove = validMoves.some(move => move.row === row && move.col === col);
    
    if (isValidMove) {
      try {
        const response = await apiClient.makeChessMove(gameId, selectedSquare, { row, col });
        
        if (response.success && response.gameState) {
          setGameState(response.gameState);
          setSquares(response.gameState.board);
          setSelectedSquare(null);
          setValidMoves([]);
        } else {
          console.error('Move failed:', response.error);
          setError(response.error || 'Move failed');
        }
      } catch (err) {
        console.error('Failed to make move:', err);
        setError('Failed to make move');
      }
    } else {
      // Try to select a different piece
      const square = squares[row][col];
      if (square.piece && square.piece.color === playerColor) {
        setSelectedSquare({ row, col });
        
        try {
          const response = await apiClient.getValidMoves(gameId, row, col);
          if (response.success && response.validMoves) {
            setValidMoves(response.validMoves);
          }
        } catch (err) {
          console.error('Failed to get valid moves:', err);
        }
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  const handleBackToBrowse = () => {
    dispatch({
      type: 'NAVIGATE_TO_BROWSE_GAMES',
      userAddress: userAddress || ''
    });
  };

  const formatWager = (wager: string) => {
    try {
      const wagerBigInt = BigInt(wager);
      const ethAmount = wagerBigInt / BigInt(1e18);
      return `${ethAmount} ETH`;
    } catch {
      return '0 ETH';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Chess Arena</h1>
            <button
              onClick={handleBackToBrowse}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Back to Browse Games
            </button>
          </div>
          
          {/* Game Info */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Game ID</h3>
                <p className="text-lg font-mono">{gameId.substring(0, 8)}...</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Wager</h3>
                <p className="text-lg font-semibold text-green-600">{formatWager(wagerAmount)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Your Role</h3>
                <p className="text-lg font-semibold">{isOwner ? 'White (Owner)' : 'Black (Opponent)'}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">You: </span>
                  <span className="font-mono">{formatAddress(userAddress || '')}</span>
                </div>
                <div className="text-gray-400">vs</div>
                <div>
                  <span className="text-sm text-gray-500">Opponent: </span>
                  <span className="font-mono">{formatAddress(opponentAddress || '')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chess Board */}
        <div className="flex justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {loading ? (
              <div className="flex items-center justify-center" style={{ width: 480, height: 480 }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <ChessBoard
                squares={squares}
                onSquareClick={handleSquareClick}
                size={480}
                validMoves={validMoves}
                selectedSquare={selectedSquare}
              />
            )}
          </div>
        </div>

        {/* Game Status */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Game Status</h3>
              {error && (
                <p className="text-red-600 text-sm mt-1">{error}</p>
              )}
              {gameState && (
                <div className="mt-2">
                  <p className="text-gray-600">
                    Status: <span className={`font-semibold ${
                      gameState.gameStatus === 'check' ? 'text-red-600' :
                      gameState.gameStatus === 'checkmate' ? 'text-red-800' :
                      gameState.gameStatus === 'stalemate' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {gameState.gameStatus.toUpperCase()}
                    </span>
                  </p>
                  {gameState.winner && (
                    <p className="text-lg font-bold text-blue-600">
                      Winner: {gameState.winner === 'white' ? 'White' : 'Black'}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Current Turn</div>
              <div className={`text-lg font-semibold ${
                gameState?.currentPlayer === 'white' ? 'text-gray-800' : 'text-gray-600'
              }`}>
                {gameState?.currentPlayer === 'white' ? 'White' : 'Black'} to move
              </div>
              {gameState && (
                <div className="text-sm text-gray-500 mt-1">
                  Move #{gameState.fullMoveNumber}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Square Info */}
        {selectedSquare && (
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800">Selected Square</h3>
            <p className="text-blue-600">
              Row: {selectedSquare.row}, Column: {selectedSquare.col}
              {squares[selectedSquare.row][selectedSquare.col].piece && (
                <span className="ml-2">
                  - {squares[selectedSquare.row][selectedSquare.col].piece?.color} {squares[selectedSquare.row][selectedSquare.col].piece?.type}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
