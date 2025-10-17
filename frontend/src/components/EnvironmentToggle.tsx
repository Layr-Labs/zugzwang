import React from 'react';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { Environment } from '../config/environment';

const EnvironmentToggle: React.FC = () => {
  const { environment, setEnvironment, backendConfig } = useEnvironment();

  const environments: { key: Environment; label: string; description: string }[] = [
    { key: 'local', label: 'Local', description: 'localhost:8000' },
    { key: 'testnet', label: 'Testnet', description: '34.61.95.164:8000' }
  ];

  const handleEnvironmentChange = (newEnv: Environment) => {
    setEnvironment(newEnv);
    // Force a page reload to ensure all components pick up the new environment
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Backend Environment</h3>
      <div className="space-y-2">
        {environments.map((env) => (
          <label
            key={env.key}
            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
              environment === env.key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="environment"
              value={env.key}
              checked={environment === env.key}
              onChange={() => handleEnvironmentChange(env.key)}
              className="sr-only"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{env.label}</span>
                <div className={`w-3 h-3 rounded-full ${
                  environment === env.key ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
              </div>
              <p className="text-sm text-gray-600 mt-1">{env.description}</p>
            </div>
          </label>
        ))}
      </div>
      <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
        <strong>Current:</strong> {backendConfig.fullUrl}
      </div>
    </div>
  );
};

export default EnvironmentToggle;
