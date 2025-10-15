import { Router, Request, Response } from 'express';
import { GameLobby } from '../services/GameLobby';
import { BlockchainService } from '../services/BlockchainService';
import { GameApiResponse, GamesListApiResponse, serializeGame, AcceptGameInvitationRequest, NetworkType } from '../types/Game';
import { MoveRequest, MoveResponse } from '../types/Chess';
import { authenticateUser, validateAddressOwnership, AuthenticatedRequest, signTransactionWithPrivy } from '../middleware/auth';

const router = Router();
const gameLobby = GameLobby.getInstance();

// Note: Create game and join game functionality moved to frontend using direct contract interaction
// Games are now created and joined via event polling from the escrow contract

// Accept a game invitation
router.post('/accept-invitation', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId, wagerAmount } = req.body as AcceptGameInvitationRequest;
    const opponent = req.user!.address; // Get from authenticated user

    // Validate required fields
    if (!gameId || !wagerAmount) {
      const response: GameApiResponse = {
        success: false,
        error: 'Game ID and wager amount are required'
      };
      return res.status(400).json(response);
    }

    // Convert wagerAmount to BigInt (assuming it's in ETH as string)
    const wager = BigInt(Math.floor(parseFloat(wagerAmount) * 1e18));

    // Validate wager amount (minimum 0.0001 ETH)
    const minWager = BigInt(100000000000000); // 0.0001 ETH in wei
    if (wager < minWager) {
      const response: GameApiResponse = {
        success: false,
        error: 'Wager must be at least 0.0001 ETH'
      };
      return res.status(400).json(response);
    }

    console.log('🎯 [ROUTE] Accepting game invitation:', {
      gameId: gameId,
      opponent: opponent,
      wagerAmount: wagerAmount
    });

    const game = gameLobby.acceptGameInvitation(gameId, opponent, wager.toString());
    
    if (!game) {
      const response: GameApiResponse = {
        success: false,
        error: 'Game not found, not in WAITING state, or invitation cannot be accepted'
      };
      return res.status(404).json(response);
    }

    const response: GameApiResponse = {
      success: true,
      data: serializeGame(game)
    };
    
    res.json(response);
  } catch (error) {
    console.error('💥 [ROUTE] Error accepting game invitation:', error);
    const response: GameApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Settle a game
router.post('/:gameId/settle', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const game = gameLobby.settleGame(gameId);
    
    if (!game) {
      const response: GameApiResponse = {
        success: false,
        error: 'Game not found or cannot be settled'
      };
      return res.status(404).json(response);
    }

    const response: GameApiResponse = {
      success: true,
      data: serializeGame(game)
    };
    
    res.json(response);
  } catch (error) {
    const response: GameApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Get open games (games waiting for opponents) - MUST be before /:gameId
router.get('/open', (req: Request, res: Response) => {
  try {
    const excludeUserAddress = req.query.excludeUser as string;
    console.log('🔍 [ROUTE] Getting open games, excludeUserAddress:', excludeUserAddress);
    const games = gameLobby.getOpenGames(excludeUserAddress);
    
    console.log('🔍 [ROUTE] Open games found:', games.length);
    
    const response: GamesListApiResponse = {
      success: true,
      data: games.map(serializeGame)
    };
    
    res.json(response);
  } catch (error) {
    console.error('🔍 [ROUTE] Error getting open games:', error);
    const response: GamesListApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Get active games (STARTED games where user is owner or opponent)
router.get('/active', (req: Request, res: Response) => {
  try {
    const userAddress = req.query.user as string;
    
    if (!userAddress) {
      const response: GamesListApiResponse = {
        success: false,
        error: 'User address is required'
      };
      return res.status(400).json(response);
    }
    
    const games = gameLobby.getActiveGames(userAddress);
    
    const response: GamesListApiResponse = {
      success: true,
      data: games.map(serializeGame)
    };
    
    res.json(response);
  } catch (error) {
    const response: GamesListApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Get game invitations (WAITING games where user is invited as opponent)
router.get('/invitations', (req: Request, res: Response) => {
  try {
    const userAddress = req.query.user as string;
    
    if (!userAddress) {
      const response: GamesListApiResponse = {
        success: false,
        error: 'User address is required'
      };
      return res.status(400).json(response);
    }
    
    console.log('🔍 [ROUTE] Getting game invitations for user:', userAddress);
    const games = gameLobby.getGameInvitations(userAddress);
    console.log('🔍 [ROUTE] Game invitations found:', games.length);
    
    const response: GamesListApiResponse = {
      success: true,
      data: games.map(serializeGame)
    };
    
    res.json(response);
  } catch (error) {
    console.error('🔍 [ROUTE] Error getting game invitations:', error);
    const response: GamesListApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Get game statistics - MUST be before /:gameId
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = gameLobby.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all games
router.get('/', (req: Request, res: Response) => {
  try {
    const { state, owner, opponent } = req.query;
    let games;

    if (state) {
      games = gameLobby.getGamesByState(state as any);
    } else if (owner) {
      console.log('🔍 [ROUTE] Getting games by owner:', owner);
      console.log('🔍 [ROUTE] Owner address type:', typeof owner);
      console.log('🔍 [ROUTE] Owner address length:', owner.length);
      games = gameLobby.getGamesByOwner(owner as string);
      console.log('🔍 [ROUTE] Games found for owner:', games.length);
    } else if (opponent) {
      games = gameLobby.getGamesByOpponent(opponent as string);
    } else {
      games = gameLobby.getAllGames();
    }

    const response: GamesListApiResponse = {
      success: true,
      data: games.map(serializeGame)
    };
    
    res.json(response);
  } catch (error) {
    const response: GamesListApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Get settled games for a user
router.get('/settled', async (req: Request, res: Response) => {
  try {
    const userAddress = req.query.userAddress as string;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    console.log('📊 [GAME_ROUTES] Getting settled games for user:', userAddress.substring(0, 8) + '...');
    
    const settledGames = gameLobby.getSettledGames(userAddress);
    
    console.log('📊 [GAME_ROUTES] Settled games found:', {
      userAddress: userAddress.substring(0, 8) + '...',
      count: settledGames.length,
      games: settledGames.map(g => ({
        id: g.id.substring(0, 8) + '...',
        state: g.state,
        winner: g.winner,
        owner: g.owner?.substring(0, 8) + '...',
        opponent: g.opponent?.substring(0, 8) + '...'
      }))
    });

    res.json({
      success: true,
      data: settledGames.map(serializeGame)
    });
  } catch (error) {
    console.error('💥 [GAME_ROUTES] Error getting settled games:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get a specific game - MUST be last
router.get('/:gameId', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const game = gameLobby.getGame(gameId);
    
    if (!game) {
      const response: GameApiResponse = {
        success: false,
        error: 'Game not found'
      };
      return res.status(404).json(response);
    }

    const response: GameApiResponse = {
      success: true,
      data: serializeGame(game)
    };
    
    res.json(response);
  } catch (error) {
    const response: GameApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Get chess game state
router.get('/:gameId/chess', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    const chessState = gameLobby.getChessGameState(gameId);
    
    if (!chessState) {
      const response: GameApiResponse = {
        success: false,
        error: 'Game not found or chess not initialized'
      };
      return res.status(404).json(response);
    }

    const response = {
      success: true,
      data: chessState
    };
    
    res.json(response);
  } catch (error) {
    const response: GameApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Get valid moves for a piece
router.get('/:gameId/chess/valid-moves/:row/:col', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId, row, col } = req.params;
    const userAddress = req.user?.address;

    if (!userAddress) {
      const response: MoveResponse = {
        success: false,
        error: 'User address not found'
      };
      return res.status(401).json(response);
    }

    const rowNum = parseInt(row);
    const colNum = parseInt(col);

    if (isNaN(rowNum) || isNaN(colNum) || rowNum < 0 || rowNum > 7 || colNum < 0 || colNum > 7) {
      const response: MoveResponse = {
        success: false,
        error: 'Invalid coordinates'
      };
      return res.status(400).json(response);
    }

    const result = gameLobby.getValidMoves(gameId, rowNum, colNum, userAddress);
    
    if (!result.success) {
      const response: MoveResponse = {
        success: false,
        error: result.error
      };
      return res.status(400).json(response);
    }

    const response: MoveResponse = {
      success: true,
      validMoves: result.validMoves
    };
    
    res.json(response);
  } catch (error) {
    const response: MoveResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Make a chess move
router.post('/:gameId/chess/move', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const { from, to, promotionPiece } = req.body as MoveRequest;
    const userAddress = req.user?.address;

    console.log('🎯 [SERVER] Chess move request received:', {
      gameId: gameId.substring(0, 8) + '...',
      userAddress: userAddress?.substring(0, 8) + '...',
      from: from,
      to: to,
      promotionPiece: promotionPiece,
      requestBody: req.body
    });

    if (!userAddress) {
      console.log('❌ [SERVER] User address not found');
      const response: MoveResponse = {
        success: false,
        error: 'User address not found'
      };
      return res.status(401).json(response);
    }

    if (!from || !to || typeof from.row !== 'number' || typeof from.col !== 'number' || 
        typeof to.row !== 'number' || typeof to.col !== 'number') {
      console.log('❌ [SERVER] Invalid move coordinates:', { from, to });
      const response: MoveResponse = {
        success: false,
        error: 'Invalid move coordinates'
      };
      return res.status(400).json(response);
    }

    console.log('🔄 [SERVER] Calling gameLobby.makeChessMove...');
    const result = gameLobby.makeChessMove(
      gameId, 
      from.row, 
      from.col, 
      to.row, 
      to.col, 
      userAddress, 
      promotionPiece
    );
    
    console.log('📊 [SERVER] GameLobby result:', {
      success: result.success,
      hasMove: !!result.move,
      hasGameState: !!result.gameState,
      error: result.error,
      moveDetails: result.move ? {
        from: result.move.from,
        to: result.move.to,
        piece: result.move.piece ? `${result.move.piece.color} ${result.move.piece.type}` : 'none',
        capturedPiece: result.move.capturedPiece ? `${result.move.capturedPiece.color} ${result.move.capturedPiece.type}` : 'none'
      } : null,
      gameStateDetails: result.gameState ? {
        currentPlayer: result.gameState.currentPlayer,
        gameStatus: result.gameState.gameStatus,
        fullMoveNumber: result.gameState.fullMoveNumber,
        winner: result.gameState.winner,
        moveHistoryLength: result.gameState.moveHistory?.length || 0
      } : null
    });
    
    if (!result.success) {
      console.log('❌ [SERVER] Move failed, returning error response');
      const response: MoveResponse = {
        success: false,
        error: result.error
      };
      return res.status(400).json(response);
    }

    const response: MoveResponse = {
      success: true,
      move: result.move,
      gameState: result.gameState
    };
    
    console.log('✅ [SERVER] Sending successful response:', {
      success: response.success,
      hasMove: !!response.move,
      hasGameState: !!response.gameState,
      gameStateDetails: response.gameState ? {
        currentPlayer: response.gameState.currentPlayer,
        gameStatus: response.gameState.gameStatus,
        fullMoveNumber: response.gameState.fullMoveNumber,
        winner: response.gameState.winner,
        boardSize: response.gameState.board?.length + 'x' + response.gameState.board?.[0]?.length
      } : null,
      responseSize: JSON.stringify(response).length + ' bytes'
    });
    
    res.json(response);
  } catch (error) {
    console.error('💥 [SERVER] Exception in chess move endpoint:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    const response: MoveResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;