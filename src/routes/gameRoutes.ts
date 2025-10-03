import { Router, Request, Response } from 'express';
import { GameLobby } from '../services/GameLobby';
import { CreateGameRequest, JoinGameRequest, GameApiResponse, GamesListApiResponse, serializeGame } from '../types/Game';

const router = Router();
const gameLobby = GameLobby.getInstance();

// Create a new game
router.post('/create', (req: Request, res: Response) => {
  try {
    const { owner, opponent, wager } = req.body as CreateGameRequest;

    // Validate required fields
    if (!owner || !wager) {
      const response: GameApiResponse = {
        success: false,
        error: 'Owner and wager are required'
      };
      return res.status(400).json(response);
    }

    // Validate Ethereum address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      const response: GameApiResponse = {
        success: false,
        error: 'Invalid owner address format'
      };
      return res.status(400).json(response);
    }

    // Validate opponent address if provided
    if (opponent && !/^0x[a-fA-F0-9]{40}$/.test(opponent)) {
      const response: GameApiResponse = {
        success: false,
        error: 'Invalid opponent address format'
      };
      return res.status(400).json(response);
    }

    // Validate wager amount
    try {
      const wagerBigInt = BigInt(wager);
      if (wagerBigInt <= 0) {
        const response: GameApiResponse = {
          success: false,
          error: 'Wager must be greater than 0'
        };
        return res.status(400).json(response);
      }
    } catch (error) {
      const response: GameApiResponse = {
        success: false,
        error: 'Invalid wager amount'
      };
      return res.status(400).json(response);
    }

    const game = gameLobby.createGame({ owner, opponent, wager });
    
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
router.post('/join', (req: Request, res: Response) => {
  try {
    const { gameId, opponent } = req.body as JoinGameRequest;

    // Validate required fields
    if (!gameId || !opponent) {
      const response: GameApiResponse = {
        success: false,
        error: 'Game ID and opponent are required'
      };
      return res.status(400).json(response);
    }

    // Validate opponent address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(opponent)) {
      const response: GameApiResponse = {
        success: false,
        error: 'Invalid opponent address format'
      };
      return res.status(400).json(response);
    }

    const game = gameLobby.joinGame({ gameId, opponent });
    
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
router.post('/:gameId/settle', (req: Request, res: Response) => {
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

export default router;