import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';

// Load contract metadata
import contractMetadata from '../contracts/ChessEscrowMetadata.json';
import contractABI from '../contracts/ChessEscrow.json';

export interface EscrowContractService {
  createGame: (gameId: string, opponent: string | null, wagerAmount: string) => Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;
  joinGame: (gameId: string, wagerAmount: string) => Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;
  getContractAddress: () => string;
  getChainId: () => number;
}

export const useEscrowContract = (): EscrowContractService => {
  const { ready, authenticated, user, sendTransaction } = usePrivy();

  const getContractAddress = (): string => {
    return contractMetadata.address;
  };

  const getChainId = (): number => {
    return contractMetadata.chainId;
  };

  const createGame = async (
    gameId: string, 
    opponent: string | null, 
    wagerAmount: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> => {
    try {
      if (!ready || !authenticated || !user?.wallet) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      // Convert wager amount to wei
      const wagerAmountWei = ethers.utils.parseEther(wagerAmount);

      // Prepare transaction data
      const opponentAddress = opponent || ethers.constants.AddressZero;
      
      console.log('🎮 [ESCROW_CONTRACT] Creating game:', {
        gameId,
        opponent: opponentAddress,
        wagerAmount: wagerAmountWei.toString(),
        contractAddress: contractMetadata.address
      });

      // Create contract interface for encoding
      const contractInterface = new ethers.utils.Interface(contractABI);
      
      // Encode the function call
      const data = contractInterface.encodeFunctionData('createGame', [
        gameId,
        opponentAddress
      ]);

      // Prepare the transaction
      const tx = {
        to: contractMetadata.address,
        data: data,
        value: wagerAmountWei.toHexString(),
        gasLimit: '200000' // Estimated gas limit
      };

      // Sign and send transaction
      const receipt = await sendTransaction(tx);
      
      console.log('✅ [ESCROW_CONTRACT] Game created successfully:', {
        transactionHash: receipt.transactionHash
      });

      return {
        success: true,
        transactionHash: receipt.transactionHash
      };

    } catch (error) {
      console.error('❌ [ESCROW_CONTRACT] Failed to create game:', error);
      
      let errorMessage = 'Failed to create game';
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for wager amount';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const joinGame = async (
    gameId: string, 
    wagerAmount: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> => {
    try {
      if (!ready || !authenticated || !user?.wallet) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      // Convert wager amount to wei
      const wagerAmountWei = ethers.utils.parseEther(wagerAmount);

      console.log('🎮 [ESCROW_CONTRACT] Joining game:', {
        gameId,
        wagerAmount: wagerAmountWei.toString(),
        contractAddress: contractMetadata.address
      });

      // Create contract interface for encoding
      const contractInterface = new ethers.utils.Interface(contractABI);
      
      // Encode the function call
      const data = contractInterface.encodeFunctionData('joinGame', [gameId]);

      // Prepare the transaction
      const tx = {
        to: contractMetadata.address,
        data: data,
        value: wagerAmountWei.toHexString(),
        gasLimit: '200000' // Estimated gas limit
      };

      // Sign and send transaction
      const receipt = await sendTransaction(tx);
      
      console.log('✅ [ESCROW_CONTRACT] Game joined successfully:', {
        transactionHash: receipt.transactionHash
      });

      return {
        success: true,
        transactionHash: receipt.transactionHash
      };

    } catch (error) {
      console.error('❌ [ESCROW_CONTRACT] Failed to join game:', error);
      
      let errorMessage = 'Failed to join game';
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for wager amount';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  return {
    createGame,
    joinGame,
    getContractAddress,
    getChainId
  };
};