import React from 'react';
import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';

interface PrivyProviderProps {
  children: React.ReactNode;
}

export const PrivyProvider: React.FC<PrivyProviderProps> = ({ children }) => {
  return (
    <PrivyProviderBase
      appId={process.env.REACT_APP_PRIVY_APP_ID || 'your-privy-app-id'}
      config={{
        loginMethods: ['wallet', 'email', 'sms'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  );
};
