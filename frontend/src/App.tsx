import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from './state/GameStateManager';
import { GameStateType } from './state/GameState';
import { LandingPage } from './views/LandingPage';
import { WelcomeView } from './views/WelcomeView';

const App: React.FC = () => {
  const { ready, authenticated } = usePrivy();
  const { state } = useGameState();

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

  // Show welcome view if user is authenticated, otherwise show landing page
  if (authenticated && state.type === GameStateType.MENU) {
    return <WelcomeView />;
  }

  return <LandingPage />;
};

export default App;
