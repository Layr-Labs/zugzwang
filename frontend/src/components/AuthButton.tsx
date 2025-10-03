import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useGameState } from '../state/GameStateManager';

export const AuthButton: React.FC = () => {
  const { ready, authenticated, login, logout } = usePrivy();
  const { dispatch } = useGameState();

  const handleLogin = async () => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      dispatch({ type: 'CLEAR_ERROR' });
      await login();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: 'Failed to login. Please try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  };

  const handleLogout = async () => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      await logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: 'Failed to logout. Please try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  };

  if (!ready) {
    return (
      <button disabled className="px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
        Loading...
      </button>
    );
  }

  if (authenticated) {
    return (
      <button
        onClick={handleLogout}
        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
      >
        Disconnect
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
    >
      Connect Wallet
    </button>
  );
};
