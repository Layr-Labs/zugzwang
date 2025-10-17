import React, { useState } from 'react';
import { config, validateConfig } from '../config';
import { useEnvironment } from '../contexts/EnvironmentContext';
import EnvironmentToggle from './EnvironmentToggle';

interface ConfigDisplayProps {
  showInProduction?: boolean;
}

export const ConfigDisplay: React.FC<ConfigDisplayProps> = ({ 
  showInProduction = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { environment, backendConfig } = useEnvironment();
  const { isValid, errors } = validateConfig();

  // Don't show in production unless explicitly allowed
  if (environment === 'production' && !showInProduction) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg text-xs max-w-sm">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-mono">
          {environment.toUpperCase()}
        </span>
        <span className={`ml-2 ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          {isValid ? '✓' : '✗'}
        </span>
        <span className="ml-2">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="space-y-3">
            <EnvironmentToggle />
            <div className="space-y-1">
              <div>
                <span className="text-gray-400">Backend:</span>
                <span className="ml-1 font-mono">{backendConfig.fullUrl}</span>
              </div>
              <div>
                <span className="text-gray-400">Privy:</span>
                <span className="ml-1">
                  {config.privy.appId ? '✅' : '❌'}
                </span>
              </div>
              {!isValid && (
                <div className="text-red-400">
                  <div className="font-semibold">Errors:</div>
                  {errors.map((error, index) => (
                    <div key={index} className="text-xs">• {error}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
