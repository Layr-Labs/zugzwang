import { config } from './environment';

/**
 * Validates that all required configuration values are present
 */
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check Privy App ID
  if (!config.privy.appId) {
    errors.push('REACT_APP_PRIVY_APP_ID is required');
  }

  // Check backend URL
  if (!config.backend.fullUrl) {
    errors.push('Backend URL is not configured');
  }

  // Validate URL format
  try {
    new URL(config.backend.fullUrl);
  } catch {
    errors.push(`Invalid backend URL format: ${config.backend.fullUrl}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Logs configuration information to console (only in development)
 */
export const logConfig = (): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group('🔧 Zugzwang Configuration');
    console.log('Environment:', config.environment);
    console.log('Backend URL:', config.backend.fullUrl);
    console.log('Privy App ID:', config.privy.appId ? '✅ Set' : '❌ Missing');
    console.groupEnd();
  }
};

/**
 * Gets a human-readable environment name
 */
export const getEnvironmentDisplayName = (): string => {
  const names: Record<string, string> = {
    local: 'Local Development',
    development: 'Development',
    staging: 'Staging',
    production: 'Production'
  };
  
  return names[config.environment] || 'Unknown';
};
