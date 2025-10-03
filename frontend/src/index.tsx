import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from './components/PrivyProvider';
import { GameStateProvider } from './state/GameStateManager';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <PrivyProvider>
      <GameStateProvider>
        <App />
      </GameStateProvider>
    </PrivyProvider>
  </React.StrictMode>
);
