import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from '../state/GameStateManager';
import { AuthButton } from '../components/AuthButton';

export const WelcomeView: React.FC = () => {
  const { user } = usePrivy();
  const { state } = useGameState();

  const userAddress = user?.wallet?.address || (state.type === 'MENU' ? state.userAddress : undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Zugzwang</h1>
          <p className="text-gray-600 mb-2">You are successfully connected!</p>
          {userAddress && (
            <p className="text-sm text-gray-500 font-mono break-all">
              {userAddress}
            </p>
          )}
        </div>
        
        <div className="mb-6">
          <AuthButton />
        </div>
        
        {state.isLoading && (
          <div className="text-blue-500 text-sm">
            Processing...
          </div>
        )}
      </div>
    </div>
  );
};
