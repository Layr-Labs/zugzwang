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
      
      console.log('🔄 Loading game state for game:', gameId.substring(0, 8) + '...');
      const response = await apiClient.getChessGameState(gameId);
      
      console.log('📊 Game state response:', {
        success: response.success,
        hasData: !!response.data,
        error: response.error,
        gameState: response.data ? {
          currentPlayer: response.data.currentPlayer,
          gameStatus: response.data.gameStatus,
          fullMoveNumber: response.data.fullMoveNumber,
          boardSize: response.data.board?.length + 'x' + response.data.board?.[0]?.length
        } : null
      });
      
      if (response.success && response.data) {
        setGameState(response.data);
        setSquares(response.data.board);
        console.log('✅ Game state loaded successfully');
      } else {
        console.error('❌ Failed to load game state:', response.error);
        setError(response.error || 'Failed to load game state');
      }
    } catch (err) {
      console.error('💥 Exception loading game state:', err);
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
          console.log('🔍 Getting valid moves for piece at:', { row, col, piece: square.piece });
          const response = await apiClient.getValidMoves(gameId, row, col);
          console.log('📋 Valid moves response:', {
            success: response.success,
            validMovesCount: response.validMoves?.length || 0,
            validMoves: response.validMoves
          });
          if (response.success && response.validMoves) {
            setValidMoves(response.validMoves);
          }
        } catch (err) {
          console.error('💥 Failed to get valid moves:', err);
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
      const moveFrom = selectedSquare;
      const moveTo = { row, col };
      const piece = squares[moveFrom.row][moveFrom.col].piece;
      
      console.log('🎯 Attempting chess move:', {
        gameId: gameId.substring(0, 8) + '...',
        from: { row: moveFrom.row, col: moveFrom.col },
        to: { row: moveTo.row, col: moveTo.col },
        piece: piece ? `${piece.color} ${piece.type}` : 'none',
        playerColor: playerColor,
        currentPlayer: gameState?.currentPlayer
      });
      
      try {
        console.log('📤 Sending move request to server...');
        const response = await apiClient.makeChessMove(gameId, moveFrom, moveTo);
        
        console.log('📥 Server response received:', {
          success: response.success,
          hasGameState: !!response.gameState,
          error: response.error,
          responseKeys: Object.keys(response)
        });
        
        if (response.success && response.gameState) {
          console.log('✅ Move successful! New game state:', {
            currentPlayer: response.gameState.currentPlayer,
            gameStatus: response.gameState.gameStatus,
            fullMoveNumber: response.gameState.fullMoveNumber,
            winner: response.gameState.winner,
            boardSize: response.gameState.board?.length + 'x' + response.gameState.board?.[0]?.length
          });
          
          setGameState(response.gameState);
          setSquares(response.gameState.board);
          setSelectedSquare(null);
          setValidMoves([]);
        } else {
          console.error('❌ Move failed:', {
            error: response.error,
            success: response.success,
            hasGameState: !!response.gameState
          });
          setError(response.error || 'Move failed');
        }
      } catch (err) {
        console.error('💥 Exception during move:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        });
        setError('Failed to make move');
      }
    } else {
      // Try to select a different piece
      const square = squares[row][col];
      if (square.piece && square.piece.color === playerColor) {
        setSelectedSquare({ row, col });
        
        try {
          console.log('🔍 Getting valid moves for new piece at:', { row, col, piece: square.piece });
          const response = await apiClient.getValidMoves(gameId, row, col);
          console.log('📋 Valid moves response (new piece):', {
            success: response.success,
            validMovesCount: response.validMoves?.length || 0,
            validMoves: response.validMoves
          });
          if (response.success && response.validMoves) {
            setValidMoves(response.validMoves);
          }
        } catch (err) {
          console.error('💥 Failed to get valid moves (new piece):', err);
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
