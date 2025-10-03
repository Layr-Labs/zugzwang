# zugzwang

A TypeScript application with React frontend and Privy authentication integration.

## Project Structure

- `src/` - Backend TypeScript application
- `frontend/` - React frontend with Privy authentication

## Frontend Development

The frontend is a React application with Privy authentication and account abstraction wallet integration.

### Quick Start
```bash
cd frontend
npm install
cp env.example .env.local
# Edit .env.local and add your Privy App ID from https://dashboard.privy.io/
npm start
```

### Features
- **Privy Authentication**: Seamless wallet connection with account abstraction
- **GameState Management**: Clean separation of login and menu states
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS

See `frontend/README.md` for detailed frontend documentation.

## Backend Development

### Setup & Local Testing
```bash
npm install
cp .env.example .env
npm run dev
```

### Docker Testing
```bash
docker build -t my-app .
docker run --rm --env-file .env my-app
```
