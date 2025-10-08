import { usePrivy } from '@privy-io/react-auth';
import { getApiUrl } from '../config/environment';
import { useMemo } from 'react';

export const useApiClient = () => {
  const { getAccessToken } = usePrivy();

  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getAccessToken();
    console.log('🔍 FRONTEND DEBUG - Making request to:', getApiUrl(endpoint));
    console.log('🔍 FRONTEND DEBUG - Token:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('🔍 FRONTEND DEBUG - Token length:', token ? token.length : 0);
    
    const response = await fetch(getApiUrl(endpoint), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log('🔍 FRONTEND DEBUG - Response status:', response.status);
    console.log('🔍 FRONTEND DEBUG - Response ok:', response.ok);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.log('🔍 FRONTEND DEBUG - Error response:', error);
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('🔍 FRONTEND DEBUG - Response data:', data);
    return data;
  };

  return useMemo(() => ({
    createGame: async (wagerAmount: string, opponentAddress?: string) => {
      return makeRequest('/api/games/create', {
        method: 'POST',
        body: JSON.stringify({
          wagerAmount,
          opponent: opponentAddress || null,
        }),
      });
    },

    getGames: async () => {
      return makeRequest('/api/games');
    },

    getOpenGames: async (excludeUserAddress?: string) => {
      const url = excludeUserAddress 
        ? `/api/games/open?excludeUser=${encodeURIComponent(excludeUserAddress)}`
        : '/api/games/open';
      return makeRequest(url);
    },

    getUserGames: async (userAddress: string) => {
      return makeRequest(`/api/games?owner=${userAddress}`);
    },

    getUserChallenges: async (userAddress: string) => {
      return makeRequest(`/api/games?opponent=${userAddress}`);
    },

    getActiveGames: async (userAddress: string) => {
      return makeRequest(`/api/games/active?user=${userAddress}`);
    },

    getGameInvitations: async (userAddress: string) => {
      return makeRequest(`/api/games/invitations?user=${userAddress}`);
    },

    acceptGameInvitation: async (gameId: string, wagerAmount: string) => {
      return makeRequest('/api/games/accept-invitation', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          wagerAmount,
        }),
      });
    },

    joinGame: async (gameId: string) => {
      return makeRequest('/api/games/join', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
        }),
      });
    },

    getGame: async (gameId: string) => {
      return makeRequest(`/api/games/${gameId}`);
    },

    getChessGameState: async (gameId: string) => {
      return makeRequest(`/api/games/${gameId}/chess`);
    },

    getValidMoves: async (gameId: string, row: number, col: number) => {
      return makeRequest(`/api/games/${gameId}/chess/valid-moves/${row}/${col}`);
    },

    makeChessMove: async (gameId: string, from: { row: number; col: number }, to: { row: number; col: number }, promotionPiece?: string) => {
      return makeRequest(`/api/games/${gameId}/chess/move`, {
        method: 'POST',
        body: JSON.stringify({
          from,
          to,
          promotionPiece
        }),
      });
    },

    getSettledGames: async (userAddress: string) => {
      return makeRequest(`/api/games/settled?userAddress=${encodeURIComponent(userAddress)}`);
    },
  }), [getAccessToken]);
};
