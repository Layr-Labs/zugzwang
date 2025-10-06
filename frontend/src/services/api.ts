import { usePrivy } from '@privy-io/react-auth';
import { getApiUrl } from '../config/environment';

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

  return {
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

    getOpenGames: async () => {
      return makeRequest('/api/games/open');
    },

    getUserGames: async (userAddress: string) => {
      return makeRequest(`/api/games?owner=${userAddress}`);
    },

    getUserChallenges: async (userAddress: string) => {
      return makeRequest(`/api/games?opponent=${userAddress}`);
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
  };
};
