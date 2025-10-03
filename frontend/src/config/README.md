# Frontend Configuration

This directory contains the configuration system for the Zugzwang frontend application.

## Environment Configuration

The application supports multiple environments based on the `REACT_APP_ZUGZWANG_ENVIRONMENT` environment variable:

- **local** (default): `http://localhost:3001`
- **development**: `https://dev-api.zugzwang.com`
- **staging**: `https://staging-api.zugzwang.com`
- **production**: `https://api.zugzwang.com`

## Usage

### Basic Configuration Access

```typescript
import { config, getApiUrl } from '../config';

// Get the full backend URL
console.log(config.backend.fullUrl);

// Get a specific API endpoint URL
const gamesUrl = getApiUrl('/api/games');
```

### Environment Helpers

```typescript
import { isDevelopment, isProduction } from '../config';

if (isDevelopment()) {
  console.log('Running in development mode');
}

if (isProduction()) {
  console.log('Running in production mode');
}
```

### Configuration Validation

```typescript
import { validateConfig } from '../config';

const { isValid, errors } = validateConfig();
if (!isValid) {
  console.error('Configuration errors:', errors);
}
```

## Environment Variables

Set these in your `.env.local` file:

```bash
# Required
REACT_APP_PRIVY_APP_ID=your_privy_app_id_here

# Optional (defaults to 'local')
REACT_APP_ZUGZWANG_ENVIRONMENT=local
```

## Adding New Environments

To add a new environment:

1. Add the environment to the `Environment` type in `environment.ts`
2. Add the configuration to the `configs` object
3. Update the `getEnvironment()` function if needed

## Configuration Display

The `ConfigDisplay` component shows the current configuration in the bottom-right corner (only in non-production environments by default). Click to expand and see details.

## Validation

The configuration system validates:
- Required environment variables are present
- Backend URL is properly formatted
- All configuration values are valid

Validation errors are logged to the console and displayed in the ConfigDisplay component.
