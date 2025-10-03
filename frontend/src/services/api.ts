import { usePrivy } from '@privy-io/react-auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const useApiClient = () => {
  const { getAccessToken } = usePrivy();

  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getAccessToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  };

  return {
    createGame: async (wagerAmount: string, opponentAddress?: string) => {
      return makeRequest('/api/games', {
        method: 'POST',
        body: JSON.stringify({
          wagerAmount,
          opponentAddress: opponentAddress || null,
        }),
      });
    },

    getGames: async () => {
      return makeRequest('/api/games');
    },

    joinGame: async (gameId: string) => {
      return makeRequest(`/api/games/${gameId}/join`, {
        method: 'POST',
      });
    },

    getGame: async (gameId: string) => {
      return makeRequest(`/api/games/${gameId}`);
    },
  };
};
