import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gameRoutes from './routes/gameRoutes';
import { GameLobby } from './services/GameLobby';
import { EventPollingService } from './services/EventPollingService';
import { initializePrivyClient } from './middleware/auth';

dotenv.config();

// Initialize Privy client after environment variables are loaded
initializePrivyClient();

const app = express();
const PORT = process.env.APP_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize game lobby singleton
const gameLobby = GameLobby.getInstance();

// Initialize event polling service
let eventPollingService: EventPollingService | null = null;

// Routes
app.use('/api/games', gameRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check RPC connections for all supported networks
    const { BlockchainService } = await import('./services/BlockchainService');
    const blockchainService = BlockchainService.getInstance();
    const rpcConnections = await blockchainService.validateAllRPCConnections();
    
    const allConnected = Object.values(rpcConnections).every(connected => connected);
    
    // Get event polling status
    let eventPollingStatus = null;
    if (eventPollingService) {
      eventPollingStatus = await eventPollingService.getPollingStatus();
    }
    
    res.json({
      success: true,
      message: 'Zugzwang Game Server is running',
      timestamp: new Date().toISOString(),
      stats: gameLobby.getStats(),
      rpc: {
        allConnected,
        networks: {
          11155111: {
            name: 'Ethereum Sepolia',
            connected: rpcConnections[11155111],
            url: process.env.SEPOLIA_RPC_URL || 'Not configured'
          },
          84532: {
            name: 'Base Sepolia',
            connected: rpcConnections[84532],
            url: process.env.BASE_SEPOLIA_RPC_URL || 'Not configured'
          }
        }
      },
      eventPolling: eventPollingStatus
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Zugzwang Game Server is running but RPC connection failed',
      timestamp: new Date().toISOString(),
      stats: gameLobby.getStats(),
      rpc: {
        allConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      eventPolling: eventPollingService ? await eventPollingService.getPollingStatus() : null
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Zugzwang Game Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      games: '/api/games',
      createGame: 'POST /api/games/create',
      joinGame: 'POST /api/games/join',
      settleGame: 'POST /api/games/:gameId/settle',
      getGame: 'GET /api/games/:gameId',
      getAllGames: 'GET /api/games',
      getOpenGames: 'GET /api/games/open',
      getStats: 'GET /api/games/stats'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Zugzwang Game Server running on port ${PORT}`);
  console.log(`📊 Game Lobby initialized with ${gameLobby.getStats().total} games`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🎮 API docs: http://localhost:${PORT}/`);
  console.log(`🔗 Ethereum Sepolia RPC: ${process.env.SEPOLIA_RPC_URL || 'NOT SET'}`);
  console.log(`🔗 Base Sepolia RPC: ${process.env.BASE_SEPOLIA_RPC_URL || 'NOT SET'}`);
  
  // Initialize and start event polling service
  try {
    const { BlockchainService } = await import('./services/BlockchainService');
    const blockchainService = BlockchainService.getInstance();
    eventPollingService = new EventPollingService(blockchainService, gameLobby);
    await eventPollingService.startPolling();
    console.log(`🔍 Event polling service started for escrow contract`);
  } catch (error) {
    console.error('❌ Failed to start event polling service:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Zugzwang Game Server...');
  if (eventPollingService) {
    await eventPollingService.stopPolling();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Zugzwang Game Server...');
  if (eventPollingService) {
    await eventPollingService.stopPolling();
  }
  process.exit(0);
});
