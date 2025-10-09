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

/**
 * Sign a transaction using Privy delegated actions
 * @param transaction - The transaction object to sign
 * @param userAddress - The user's wallet address
 * @param userJwt - The user's JWT token
 * @param userId - The user's Privy ID
 * @returns Promise<string> - The signed transaction
 */
export const signTransactionWithPrivy = async (
  transaction: any,
  userAddress: string,
  userJwt: string,
  userId: string
): Promise<string> => {
  try {
    console.log('🔍 [PRIVY_SIGNING] Starting two-step Privy signing process:', {
      to: transaction.to,
      value: transaction.value?.toString(),
      nonce: transaction.nonce,
      chainId: transaction.chainId,
      userAddress
    });

    // Step 1: Get user's wallet information directly
    console.log('🔍 [PRIVY_SIGNING] Step 1: Getting user wallet information...');
    console.log('🔍 [PRIVY_SIGNING] User details:', {
      userId,
      userAddress,
      tokenLength: userJwt.length
    });
    
    // Get the user object to access wallet information
    const user = await privy.getUserById(userId);
    console.log('🔍 [PRIVY_SIGNING] User object:', {
      id: user.id,
      linkedAccountsCount: user.linkedAccounts?.length || 0,
      hasWallet: !!user.wallet
    });

    // Check if user has a wallet and if it matches the address
    if (!user.wallet) {
      throw new Error(`No wallet found for user ${userId}`);
    }

    if (user.wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error(`Wallet address mismatch. User wallet: ${user.wallet.address}, provided: ${userAddress}`);
    }

    if (user.wallet.chainType !== 'ethereum') {
      throw new Error(`Wallet is not an Ethereum wallet. Chain type: ${user.wallet.chainType}`);
    }

    console.log('🔍 [PRIVY_SIGNING] Found user wallet:', {
      walletId: user.wallet.id,
      address: user.wallet.address,
      chainType: user.wallet.chainType
    });

    // Now let's try the actual Privy signing approach
    console.log('🔍 [PRIVY_SIGNING] Step 2: Attempting to sign with Privy...');
    
    try {
      // Try to use the wallet API directly with the user's JWT
      const transactionInput = {
        walletId: user.wallet.id!,
        transaction: {
          from: userAddress as `0x${string}`,
          to: transaction.to as `0x${string}`,
          value: `0x${transaction.value.toString(16)}` as `0x${string}`,
          nonce: `0x${transaction.nonce.toString(16)}` as `0x${string}`,
          gasLimit: `0x${transaction.gasLimit.toString(16)}` as `0x${string}`,
          gasPrice: transaction.gasPrice ? `0x${transaction.gasPrice.toString(16)}` as `0x${string}` : undefined,
          maxFeePerGas: transaction.maxFeePerGas ? `0x${transaction.maxFeePerGas.toString(16)}` as `0x${string}` : undefined,
          maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? `0x${transaction.maxPriorityFeePerGas.toString(16)}` as `0x${string}` : undefined,
          data: (transaction.data || '0x') as `0x${string}`,
          type: transaction.type || undefined,
          chainId: `0x${transaction.chainId.toString(16)}` as `0x${string}`
        }
      };

      console.log('🔍 [PRIVY_SIGNING] Transaction input prepared:', {
        walletId: transactionInput.walletId,
        from: transactionInput.transaction.from,
        to: transactionInput.transaction.to,
        value: transactionInput.transaction.value
      });

      // Try to sign the transaction
      const result = await privy.walletApi.ethereum.signTransaction(transactionInput);
      
      console.log('✅ [PRIVY_SIGNING] Transaction signed successfully:', {
        signedTransaction: result.signedTransaction.substring(0, 20) + '...',
        encoding: result.encoding
      });

      return result.signedTransaction;
    } catch (signError) {
      console.error('❌ [PRIVY_SIGNING] Direct signing failed:', signError);
      
      // If direct signing fails, let's try the generateUserSigner approach
      console.log('🔍 [PRIVY_SIGNING] Trying generateUserSigner approach...');
      
      try {
        const userSigner = await privy.walletApi.generateUserSigner({ userJwt });
        console.log('🔍 [PRIVY_SIGNING] User signer generated successfully');
        
        // Find the correct wallet from the signer
        const userWallets = userSigner.wallets;
        const userWallet = userWallets.find(w => 
          w.address.toLowerCase() === userAddress.toLowerCase() && 
          w.chainType === 'ethereum'
        );
        
        if (!userWallet) {
          throw new Error('No matching Ethereum wallet found in user signer');
        }
        
        console.log('🔍 [PRIVY_SIGNING] Found wallet in user signer:', {
          walletId: userWallet.id,
          address: userWallet.address,
          chainType: userWallet.chainType
        });
        
        // Now sign with the user signer
        const transactionInput = {
          walletId: userWallet.id!,
          transaction: {
            from: userAddress as `0x${string}`,
            to: transaction.to as `0x${string}`,
            value: `0x${transaction.value.toString(16)}` as `0x${string}`,
            nonce: `0x${transaction.nonce.toString(16)}` as `0x${string}`,
            gasLimit: `0x${transaction.gasLimit.toString(16)}` as `0x${string}`,
            gasPrice: transaction.gasPrice ? `0x${transaction.gasPrice.toString(16)}` as `0x${string}` : undefined,
            maxFeePerGas: transaction.maxFeePerGas ? `0x${transaction.maxFeePerGas.toString(16)}` as `0x${string}` : undefined,
            maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? `0x${transaction.maxPriorityFeePerGas.toString(16)}` as `0x${string}` : undefined,
            data: (transaction.data || '0x') as `0x${string}`,
            type: transaction.type || undefined,
            chainId: `0x${transaction.chainId.toString(16)}` as `0x${string}`
          }
        };
        
        const result = await privy.walletApi.ethereum.signTransaction(transactionInput);
        
        console.log('✅ [PRIVY_SIGNING] Transaction signed successfully with user signer:', {
          signedTransaction: result.signedTransaction.substring(0, 20) + '...',
          encoding: result.encoding
        });

        return result.signedTransaction;
      } catch (userSignerError) {
        console.error('❌ [PRIVY_SIGNING] User signer approach also failed:', userSignerError);
        throw new Error(`Both signing approaches failed. Direct: ${signError instanceof Error ? signError.message : 'Unknown'}, UserSigner: ${userSignerError instanceof Error ? userSignerError.message : 'Unknown'}`);
      }
    }

  } catch (error) {
    console.error('❌ [PRIVY_SIGNING] Error signing transaction:', error);
    throw new Error(`Failed to sign transaction with Privy: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
