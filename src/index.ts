import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gameRoutes from './routes/gameRoutes';
import { GameLobby } from './services/GameLobby';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize game lobby singleton
const gameLobby = GameLobby.getInstance();

// Routes
app.use('/api/games', gameRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Zugzwang Game Server is running',
    timestamp: new Date().toISOString(),
    stats: gameLobby.getStats()
  });
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
app.listen(PORT, () => {
  console.log(`🚀 Zugzwang Game Server running on port ${PORT}`);
  console.log(`📊 Game Lobby initialized with ${gameLobby.getStats().total} games`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🎮 API docs: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Zugzwang Game Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Zugzwang Game Server...');
  process.exit(0);
});
