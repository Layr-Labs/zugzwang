import { PrivyClient } from '@privy-io/server-auth';
import { Request, Response, NextFunction } from 'express';

// Initialize Privy client - will be set after dotenv loads
let privy: PrivyClient;

export const initializePrivyClient = () => {
  console.log('🔍 PRIVY CLIENT INIT - App ID:', process.env.PRIVY_APP_ID);
  console.log('🔍 PRIVY CLIENT INIT - App Secret exists:', !!process.env.PRIVY_APP_SECRET);

  privy = new PrivyClient(
    process.env.PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!
  );

  console.log('🔍 PRIVY CLIENT INIT - Client created successfully');
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address: string;
  };
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('🔍 AUTH DEBUG - App ID from process.env:', process.env.PRIVY_APP_ID);
    console.log('🔍 AUTH DEBUG - App Secret exists:', !!process.env.PRIVY_APP_SECRET);
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    console.log('🔍 AUTH DEBUG - Token received:', token.substring(0, 20) + '...');
    console.log('🔍 AUTH DEBUG - Token length:', token.length);
    
    // Verify the access token with Privy
    console.log('🔍 AUTH DEBUG - Verifying auth token...');
    let user;
    try {
      // First verify the token
      const claims = await privy.verifyAuthToken(token);
      console.log('🔍 AUTH DEBUG - Token verified, claims:', claims);
      
      // Extract user ID from claims
      const userId = claims.userId;
      if (!userId) {
        return res.status(401).json({ 
          error: 'Invalid token: missing user ID' 
        });
      }
      
      // Get user details using the verified user ID
      user = await privy.getUserById(userId);
      console.log('🔍 AUTH DEBUG - User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found' 
        });
      }
      
      console.log('🔍 AUTH DEBUG - User ID:', user.id);
      console.log('🔍 AUTH DEBUG - User linked accounts:', user.linkedAccounts?.length || 0);
    } catch (error) {
      console.log('🔍 AUTH DEBUG - Error details:', error);
      
      // If user not found, it might be a timing issue - let's try to decode the JWT manually
      if (error instanceof Error && error.message && error.message.includes('User not found')) {
        console.log('🔍 AUTH DEBUG - User not found, trying JWT decode...');
        try {
          // Decode JWT to get user info
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          console.log('🔍 AUTH DEBUG - JWT payload:', payload);
          
          // Create a mock user object for now
          user = {
            id: payload.sub || payload.user_id || 'unknown',
            linkedAccounts: []
          };
          console.log('🔍 AUTH DEBUG - Using JWT payload as user');
        } catch (jwtError) {
          console.log('🔍 AUTH DEBUG - JWT decode failed:', jwtError);
          return res.status(401).json({ 
            error: 'Authentication failed' 
          });
        }
      } else {
        return res.status(401).json({ 
          error: 'Authentication failed' 
        });
      }
    }

    // Extract the wallet address from the user object
    const walletAccount = user.linkedAccounts?.find(
      (account: any) => account.type === 'wallet'
    ) as any;
    const address = walletAccount?.address;

    if (!address) {
      return res.status(401).json({ 
        error: 'No wallet address found for user' 
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      address: address.toLowerCase(), // Normalize to lowercase
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed' 
    });
  }
};

// Middleware to validate that the user owns the specified address
export const validateAddressOwnership = (addressParam: string = 'address') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestedAddress = req.params[addressParam] || req.body[addressParam];
    
    if (!requestedAddress) {
      return res.status(400).json({ 
        error: `Missing ${addressParam} parameter` 
      });
    }

    if (req.user?.address !== requestedAddress.toLowerCase()) {
      return res.status(403).json({ 
        error: 'You can only perform actions for your own address' 
      });
    }

    next();
  };
};
