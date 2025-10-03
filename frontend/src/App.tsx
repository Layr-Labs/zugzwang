import React, { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from './state/GameStateManager';
import { GameStateType } from './state/GameState';
import { LandingPage } from './views/LandingPage';
import { WelcomeView } from './views/WelcomeView';
import { BrowseGamesView } from './views/BrowseGamesView';
import { CreateGameView } from './views/CreateGameView';
import { ConfigDisplay } from './components/ConfigDisplay';
import { validateConfig, logConfig } from './config';

const App: React.FC = () => {
  const { ready, authenticated } = usePrivy();
  const { state } = useGameState();

  // Validate configuration on app startup
  useEffect(() => {
    const { isValid, errors } = validateConfig();
    
    if (!isValid) {
      console.error('❌ Configuration validation failed:', errors);
    } else {
      logConfig();
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show appropriate view based on authentication and game state
  if (authenticated) {
    if (state.type === GameStateType.MENU) {
      return (
        <>
          <WelcomeView />
          <ConfigDisplay />
        </>
      );
    } else if (state.type === GameStateType.BROWSE_GAMES) {
      return (
        <>
          <BrowseGamesView />
          <ConfigDisplay />
        </>
      );
    } else if (state.type === GameStateType.CREATE_GAME) {
      return (
        <>
          <CreateGameView />
          <ConfigDisplay />
        </>
      );
    }
  }

  return (
    <>
      <LandingPage />
      <ConfigDisplay />
    </>
  );
};

export default App;
