import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from '../state/GameStateManager';
import { useApiClient } from '../services/api';
import ChessBoard, { ChessSquare } from '../components/chess/ChessBoard';
import { ChessGameState } from '../types/Chess';
import { getChainName } from '../config/chains';

export const ArenaGameView: React.FC = () => {
  const { state, dispatch } = useGameState();
  const apiClient = useApiClient();
  const [squares, setSquares] = useState<ChessSquare[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ row: number; col: number }[]>([]);
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isMakingMove, setIsMakingMove] = useState(false);
  const previousGameStateRef = useRef<ChessGameState | null>(null);

  // Extract game info early for use in useEffect
  const isOwner = state.type === 'ARENA_GAME' ? state.isOwner : false;
  const playerColor = isOwner ? 'white' : 'black';
  const isBoardFlipped = playerColor === 'black'; // Flip board for black players

  // Coordinate transformation functions for board orientation
  const transformDisplayToBackend = (displayRow: number, displayCol: number) => {
    if (!isBoardFlipped) {
      return { row: displayRow, col: displayCol };
    }
    // Flip coordinates for black players
    return { row: 7 - displayRow, col: 7 - displayCol };
  };

  const transformBackendToDisplay = (backendRow: number, backendCol: number) => {
    if (!isBoardFlipped) {
      return { row: backendRow, col: backendCol };
    }
    // Flip coordinates for black players
    return { row: 7 - backendRow, col: 7 - backendCol };
  };

  // Transform the entire board for display
  const transformBoardForDisplay = (backendBoard: ChessSquare[][]) => {
    if (!isBoardFlipped) {
      return backendBoard;
    }
    
    // Create a new board with flipped coordinates
    const displayBoard: ChessSquare[][] = Array(8).fill(null).map(() => 
      Array(8).fill(null).map(() => ({ piece: null }))
    );
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const displayCoords = transformBackendToDisplay(row, col);
        displayBoard[displayCoords.row][displayCoords.col] = backendBoard[row][col];
      }
    }
    
    return displayBoard;
  };

  // Helper function to compare board states
  const boardsAreEqual = (board1: any[][], board2: any[][]) => {
    if (!board1 || !board2) return false;
    if (board1.length !== board2.length) return false;
    
    for (let row = 0; row < board1.length; row++) {
      if (board1[row].length !== board2[row].length) return false;
      for (let col = 0; col < board1[row].length; col++) {
        const piece1 = board1[row][col].piece;
        const piece2 = board2[row][col].piece;
        
        if (!piece1 && !piece2) continue;
        if (!piece1 || !piece2) return false;
        if (piece1.type !== piece2.type || piece1.color !== piece2.color) return false;
      }
    }
    return true;
  };

  // Simple board state hash for comparison
  const getBoardHash = (board: any[][]) => {
    if (!board) return '';
    return board.map(row => 
      row.map(square => 
        square.piece ? `${square.piece.color}-${square.piece.type}` : 'empty'
      ).join('|')
    ).join('||');
  };

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
        // Only update state if there are actual changes
        const newGameState = response.data;
        const backendBoard = newGameState.board;
        const newSquares = transformBoardForDisplay(backendBoard);
        
        // Use ref for more efficient comparison
        const previousGameState = previousGameStateRef.current;
        
        // More aggressive change detection - only update if there are real changes
        const hasGameStateChanged = !previousGameState || 
          previousGameState.moveHistory.length !== newGameState.moveHistory.length ||
          previousGameState.currentPlayer !== newGameState.currentPlayer ||
          previousGameState.gameStatus !== newGameState.gameStatus ||
          previousGameState.winner !== newGameState.winner ||
          previousGameState.fullMoveNumber !== newGameState.fullMoveNumber;
        
        // For board changes, use hash comparison for more reliable detection
        const hasBoardChanged = !previousGameState || 
          getBoardHash(previousGameState.board) !== getBoardHash(backendBoard);
        
        // Debug logging
        console.log('🔍 [DEBUG] Change detection:', {
          hasPreviousState: !!previousGameState,
          hasGameStateChanged: hasGameStateChanged,
          hasBoardChanged: hasBoardChanged,
          previousMoveCount: previousGameState?.moveHistory.length || 0,
          newMoveCount: newGameState.moveHistory.length,
          previousPlayer: previousGameState?.currentPlayer,
          newPlayer: newGameState.currentPlayer,
          previousBoardHash: previousGameState ? getBoardHash(previousGameState.board).substring(0, 50) + '...' : 'none',
          newBoardHash: getBoardHash(backendBoard).substring(0, 50) + '...'
        });
        
        const hasAnyChanges = hasGameStateChanged || hasBoardChanged;
        
        if (hasAnyChanges) {
          console.log('🔄 [POLLING] Changes detected, updating UI');
          
          // Always update game state
          setGameState(newGameState);
          
          // Only update squares if board actually changed
          if (hasBoardChanged) {
            console.log('🔄 [POLLING] Board changed, updating squares');
            setSquares(newSquares);
          } else {
            console.log('🔄 [POLLING] Board unchanged, keeping current squares');
          }
          
          previousGameStateRef.current = newGameState;
          console.log('✅ Game state updated successfully');
        } else {
          console.log('🔄 [POLLING] No changes detected, skipping UI update');
        }
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

  // Poll for game state updates every 2 seconds when game is active
  useEffect(() => {
    if (state.type !== 'ARENA_GAME' || !gameState) return;

    // Only poll if game is still active (not finished)
    if (gameState.gameStatus === 'checkmate' || gameState.gameStatus === 'stalemate' || gameState.winner) {
      console.log('🔄 [POLLING] Game finished, stopping polling');
      setIsPolling(false);
      return;
    }

    console.log('🔄 [POLLING] Starting game state polling...');
    setIsPolling(true);
    
    const interval = setInterval(() => {
      // Skip polling if user is making a move
      if (isMakingMove) {
        console.log('🔄 [POLLING] Skipping poll - user making move');
        return;
      }
      
      // Only poll if it's not the user's turn (to avoid unnecessary calls)
      if (gameState.currentPlayer === playerColor) {
        console.log('🔄 [POLLING] Skipping poll - user\'s turn');
        return;
      }
      
      console.log('🔄 [POLLING] Polling for game state updates...');
      loadGameState();
    }, 2000); // Poll every 2 seconds

    return () => {
      console.log('🔄 [POLLING] Stopping game state polling');
      setIsPolling(false);
      clearInterval(interval);
    };
  }, [state.type, state.type === 'ARENA_GAME' ? state.gameId : null, gameState?.gameStatus, gameState?.winner, gameState?.currentPlayer, isOwner, isMakingMove]);

  // Only render if we're in ARENA_GAME state
  if (state.type !== 'ARENA_GAME') {
    return null;
  }

  const { gameId, userAddress, opponentAddress, wagerAmount, networkType, chainId } = state;

  const handleSquareClick = async (displayRow: number, displayCol: number) => {
    if (!gameState || !userAddress) return;

    // Transform display coordinates to backend coordinates
    const backendCoords = transformDisplayToBackend(displayRow, displayCol);
    const { row, col } = backendCoords;

    // Check if it's the player's turn
    if (gameState.currentPlayer !== playerColor) {
      console.log('Not your turn');
      return;
    }

    // If no square is selected, try to select this square
    if (!selectedSquare) {
      const square = squares[displayRow][displayCol];
      if (square.piece && square.piece.color === playerColor) {
        setSelectedSquare({ row: displayRow, col: displayCol });
        
        // Get valid moves for this piece (use backend coordinates for API)
        try {
          console.log('🔍 Getting valid moves for piece at:', { 
            displayRow, displayCol, 
            backendRow: row, backendCol: col, 
            piece: square.piece 
          });
          const response = await apiClient.getValidMoves(gameId, row, col);
          console.log('📋 Valid moves response:', {
            success: response.success,
            validMovesCount: response.validMoves?.length || 0,
            validMoves: response.validMoves
          });
          if (response.success && response.validMoves) {
            // Transform valid moves from backend coordinates to display coordinates
            const displayValidMoves = response.validMoves.map((move: { row: number; col: number }) => 
              transformBackendToDisplay(move.row, move.col)
            );
            setValidMoves(displayValidMoves);
          }
        } catch (err) {
          console.error('💥 Failed to get valid moves:', err);
        }
      }
      return;
    }

    // If a square is selected, try to make a move
    if (selectedSquare.row === displayRow && selectedSquare.col === displayCol) {
      // Deselect if clicking the same square
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Check if this is a valid move (using display coordinates)
    const isValidMove = validMoves.some(move => move.row === displayRow && move.col === displayCol);
    
    if (isValidMove) {
      // Transform selected square from display to backend coordinates
      const selectedBackendCoords = transformDisplayToBackend(selectedSquare.row, selectedSquare.col);
      const moveFrom = selectedBackendCoords;
      const moveTo = { row, col };
      const piece = squares[selectedSquare.row][selectedSquare.col].piece;
      
      console.log('🎯 Attempting chess move:', {
        gameId: gameId.substring(0, 8) + '...',
        from: { row: moveFrom.row, col: moveFrom.col },
        to: { row: moveTo.row, col: moveTo.col },
        piece: piece ? `${piece.color} ${piece.type}` : 'none',
        playerColor: playerColor,
        currentPlayer: gameState?.currentPlayer
      });
      
      try {
        setIsMakingMove(true);
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
          setSquares(transformBoardForDisplay(response.gameState.board));
          previousGameStateRef.current = response.gameState; // Update ref
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
      } finally {
        setIsMakingMove(false);
      }
    } else {
      // Try to select a different piece
      const square = squares[displayRow][displayCol];
      if (square.piece && square.piece.color === playerColor) {
        setSelectedSquare({ row: displayRow, col: displayCol });
        
        try {
          console.log('🔍 Getting valid moves for new piece at:', { 
            displayRow, displayCol, 
            backendRow: row, backendCol: col, 
            piece: square.piece 
          });
          const response = await apiClient.getValidMoves(gameId, row, col);
          console.log('📋 Valid moves response (new piece):', {
            success: response.success,
            validMovesCount: response.validMoves?.length || 0,
            validMoves: response.validMoves
          });
          if (response.success && response.validMoves) {
            // Transform valid moves from backend coordinates to display coordinates
            const displayValidMoves = response.validMoves.map((move: { row: number; col: number }) => 
              transformBackendToDisplay(move.row, move.col)
            );
            setValidMoves(displayValidMoves);
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
      const weiRemainder = wagerBigInt % BigInt(1e18);
      const decimalPart = weiRemainder.toString().padStart(18, '0').slice(0, 4);
      return `${ethAmount}.${decimalPart} ETH`;
    } catch (error) {
      console.error('Error formatting wager:', error);
      return 'Invalid wager';
    }
  };

  const formatNetwork = () => {
    if (!networkType) {
      return 'Legacy (Unknown Network)';
    }
    return getChainName(networkType, chainId);
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Game ID</h3>
                <p className="text-lg font-mono">{gameId.substring(0, 8)}...</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Wager</h3>
                <p className="text-lg font-semibold text-green-600">{formatWager(wagerAmount)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Network</h3>
                <p className="text-lg font-semibold text-blue-600">{formatNetwork()}</p>
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
          <div className="bg-white rounded-lg shadow-lg p-6 relative">
            {/* Board orientation indicator */}
            <div className="text-center mb-2 text-sm text-gray-600">
              <span className="font-semibold">{playerColor === 'white' ? 'White' : 'Black'}</span> pieces at bottom
            </div>
            
            {/* Only show board when we have valid squares data */}
            {squares && squares.length > 0 ? (
              <>
                <ChessBoard
                  squares={squares}
                  onSquareClick={handleSquareClick}
                  size={480}
                  validMoves={validMoves}
                  selectedSquare={selectedSquare}
                />
                
                {/* Polling indicator below the board */}
                {isPolling && (
                  <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                    <div className="animate-pulse flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="ml-2">Live updates</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Initial loading - show spinner until board data is loaded */
              <div className="flex items-center justify-center" style={{ width: 480, height: 480 }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
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
              {state.type === 'ARENA_GAME' && state.wagerAmount && (
                <div className="mt-2">
                  <p className="text-gray-600">
                    Wager: <span className="font-semibold text-blue-600">
                      {formatWager(state.wagerAmount)}
                    </span>
                  </p>
                </div>
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
