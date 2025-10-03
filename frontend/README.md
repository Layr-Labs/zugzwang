# Zugzwang Frontend

A React frontend application with Privy authentication and account abstraction wallet integration.

## Features

- **Privy Authentication**: Seamless wallet connection with account abstraction
- **GameState Management**: Clean separation of login and menu states
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp env.example .env.local
   ```
   Then edit `.env.local` and add your Privy App ID from [Privy Dashboard](https://dashboard.privy.io/).

3. Start the development server:
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AuthButton.tsx   # Authentication button component
│   └── PrivyProvider.tsx # Privy configuration wrapper
├── state/              # State management
│   ├── GameState.ts    # State type definitions
│   └── GameStateManager.tsx # State context and reducer
├── views/              # Page-level components
│   ├── LandingPage.tsx # Login/landing page
│   └── WelcomeView.tsx # Post-login welcome screen
├── App.tsx             # Main app component
├── index.tsx           # App entry point
└── index.css           # Global styles with Tailwind
```

## State Management

The app uses a custom state management system with GameState abstractions:

- **LogInState**: Handles authentication flow and loading states
- **MenuState**: Manages post-login user experience

This separation allows for clean component organization and easy state transitions.

## Getting Started with Privy

1. Visit [Privy Dashboard](https://dashboard.privy.io/)
2. Create a new app
3. Copy your App ID
4. Add it to your `.env.local` file as `REACT_APP_PRIVY_APP_ID`
