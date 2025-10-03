import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from '../state/GameStateManager';
import { AuthButton } from '../components/AuthButton';

export const LandingPage: React.FC = () => {
  const { ready, authenticated, user } = usePrivy();
  const { state, dispatch } = useGameState();

  React.useEffect(() => {
    if (ready && authenticated && user) {
      dispatch({ type: 'LOGIN_SUCCESS', userAddress: user.wallet?.address || '' });
    }
  }, [ready, authenticated, user, dispatch]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Zugzwang</h1>
          <p className="text-gray-600">Account Abstraction Wallet</p>
        </div>
        
        <div className="mb-6">
          <AuthButton />
        </div>
        
        {state.type === 'LOGIN' && state.error && (
          <div className="text-red-500 text-sm mt-4">
            {state.error}
          </div>
        )}
        
        {state.type === 'LOGIN' && state.isLoading && (
          <div className="text-blue-500 text-sm mt-4">
            Connecting...
          </div>
        )}
      </div>
    </div>
  );
};
