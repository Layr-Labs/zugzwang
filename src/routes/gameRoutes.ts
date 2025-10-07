import { Router, Request, Response } from 'express';
import { GameLobby } from '../services/GameLobby';
import { GameApiResponse, GamesListApiResponse, serializeGame } from '../types/Game';
import { MoveRequest, MoveResponse } from '../types/Chess';
import { authenticateUser, validateAddressOwnership, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const gameLobby = GameLobby.getInstance();

// Create a new game
router.post('/create', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { opponent, wagerAmount } = req.body;
    const owner = req.user!.address; // Get from authenticated user

    // Validate required fields
    if (!wagerAmount) {
      const response: GameApiResponse = {
        success: false,
        error: 'Wager amount is required'
      };
      return res.status(400).json(response);
    }

    // Convert wagerAmount to BigInt (assuming it's in ETH as string)
    const wager = BigInt(Math.floor(parseFloat(wagerAmount) * 1e18));

    // Owner address is already validated by authentication middleware

    // Validate opponent address if provided
    if (opponent && !/^0x[a-fA-F0-9]{40}$/.test(opponent)) {
      const response: GameApiResponse = {
        success: false,
        error: 'Invalid opponent address format'
      };
      return res.status(400).json(response);
    }

    // Validate wager amount (minimum 0.0001 ETH)
    const minWager = BigInt(100000000000000); // 0.0001 ETH in wei
    if (wager < minWager) {
      const response: GameApiResponse = {
        success: false,
        error: 'Wager must be at least 0.0001 ETH'
      };
      return res.status(400).json(response);
    }

    const game = gameLobby.createGame(owner, opponent, wager.toString());
    
    const response: GameApiResponse = {
      success: true,
      data: serializeGame(game)
    };
    
    res.status(201).json(response);
  } catch (error) {
    const response: GameApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// Join an existing game
router.post('/join', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.body;
    const opponent = req.user!.address; // Get from authenticated user

    // Validate required fields
    if (!gameId) {
      const response: GameApiResponse = {
        success: false,
        error: 'Game ID is required'
      };
      return res.status(400).json(response);
    }

    const game = gameLobby.joinGame(gameId, opponent);
    
    if (!game) {
      const response: GameApiResponse = {
        success: false,
        error: 'Game not found or cannot be joined'
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
    const games = gameLobby.getOpenGames();
    
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
      games = gameLobby.getGamesByOwner(owner as string);
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
router.get('/:gameId/chess', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const userAddress = req.user?.address;

    if (!userAddress) {
      const response: GameApiResponse = {
        success: false,
        error: 'User address not found'
      };
      return res.status(401).json(response);
    }

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

    if (!userAddress) {
      const response: MoveResponse = {
        success: false,
        error: 'User address not found'
      };
      return res.status(401).json(response);
    }

    if (!from || !to || typeof from.row !== 'number' || typeof from.col !== 'number' || 
        typeof to.row !== 'number' || typeof to.col !== 'number') {
      const response: MoveResponse = {
        success: false,
        error: 'Invalid move coordinates'
      };
      return res.status(400).json(response);
    }

    const result = gameLobby.makeChessMove(
      gameId, 
      from.row, 
      from.col, 
      to.row, 
      to.col, 
      userAddress, 
      promotionPiece
    );
    
    if (!result.success) {
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
    
    res.json(response);
  } catch (error) {
    const response: MoveResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;