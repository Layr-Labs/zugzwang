import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Environment, createConfig, BackendConfig } from '../config/environment';

interface EnvironmentContextType {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  backendConfig: BackendConfig;
  isLocal: boolean;
  isTestnet: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
}

export const EnvironmentProvider: React.FC<EnvironmentProviderProps> = ({ children }) => {
  // Initialize with environment from config or localStorage
  const [environment, setEnvironmentState] = useState<Environment>(() => {
    const saved = localStorage.getItem('zugzwang-environment');
    if (saved && ['local', 'testnet', 'development', 'staging', 'production'].includes(saved)) {
      return saved as Environment;
    }
    return createConfig().environment;
  });

  // Update localStorage when environment changes
  useEffect(() => {
    localStorage.setItem('zugzwang-environment', environment);
  }, [environment]);

  // Create backend config based on current environment
  const backendConfig = createConfig().backend;
  
  // Override with current environment's config
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

  const currentBackendConfig = configs[environment];

  const setEnvironment = (env: Environment) => {
    setEnvironmentState(env);
  };

  const value: EnvironmentContextType = {
    environment,
    setEnvironment,
    backendConfig: currentBackendConfig,
    isLocal: environment === 'local',
    isTestnet: environment === 'testnet'
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = (): EnvironmentContextType => {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
};
