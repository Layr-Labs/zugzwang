import { PrivyClient } from '@privy-io/server-auth';
import { Request, Response, NextFunction } from 'express';

// Initialize Privy client
const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

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
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the access token with Privy
    const user = await privy.getUser(token);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
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
