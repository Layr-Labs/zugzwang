export type Environment = 'local' | 'testnet' | 'development' | 'staging' | 'production';

export interface BackendConfig {
  baseUrl: string;
  port: number;
  fullUrl: string;
}

export interface AppConfig {
  environment: Environment;
  backend: BackendConfig;
  privy: {
    appId: string;
  };
}

// Environment-specific configurations
const configs: Record<Environment, BackendConfig> = {
  local: {
    baseUrl: 'http://localhost',
    port: 8000,
    fullUrl: 'http://localhost:8000'
  },
  testnet: {
    baseUrl: 'https://zugzwang-api.eigenarcade.com',
    port: 8000,
    fullUrl: 'https://zugzwang-api.eigenarcade.com:8000'
  },
  development: {
    baseUrl: 'https://dev-api.zugzwang.com',
    port: 443,
    fullUrl: 'https://dev-api.zugzwang.com'
  },
  staging: {
    baseUrl: 'https://staging-api.zugzwang.com',
    port: 443,
    fullUrl: 'https://staging-api.zugzwang.com'
  },
  production: {
    baseUrl: 'https://api.zugzwang.com',
    port: 443,
    fullUrl: 'https://api.zugzwang.com'
  }
};

// Get environment from process.env, default to 'local'
const getEnvironment = (): Environment => {
  const env = process.env.REACT_APP_ZUGZWANG_ENVIRONMENT?.toLowerCase();
  
  if (env && ['local', 'testnet', 'development', 'staging', 'production'].includes(env)) {
    return env as Environment;
  }
  
  return 'local';
};

// Create configuration object
export const createConfig = (): AppConfig => {
  const environment = getEnvironment();
  const backendConfig = configs[environment];
  
  return {
    environment,
    backend: backendConfig,
    privy: {
      appId: process.env.REACT_APP_PRIVY_APP_ID || ''
    }
  };
};

// Export the default configuration
export const config = createConfig();

// Export individual configs for convenience
export const { backend, privy } = config;
export const { baseUrl, port, fullUrl } = backend;

// Helper function to get API endpoint URL
export const getApiUrl = (endpoint: string = ''): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${fullUrl}${cleanEndpoint}`;
};

// Helper function to check if we're in development mode
export const isDevelopment = (): boolean => {
  return config.environment === 'local' || config.environment === 'development';
};

// Helper function to check if we're in production mode
export const isProduction = (): boolean => {
  return config.environment === 'production';
};
