import { ethers } from 'ethers';

export class BlockchainService {
  private static instance: BlockchainService;
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();

  private constructor() {}

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  private getRpcUrlForChainId(chainId: number): string {
    const rpcUrls: Record<number, string> = {
      11155111: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      84532: process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com'
    };

    console.log('🔍 [BLOCKCHAIN_SERVICE] Getting RPC URL for chainId:', {
      chainId,
      availableChains: Object.keys(rpcUrls),
      envVars: {
        SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
        BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL
      }
    });

    const rpcUrl = rpcUrls[chainId];
    if (!rpcUrl) {
      throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(rpcUrls).join(', ')}`);
    }
    
    console.log('🔍 [BLOCKCHAIN_SERVICE] Selected RPC URL:', {
      chainId,
      rpcUrl
    });
    
    return rpcUrl;
  }

  private getProvider(chainId: number): ethers.JsonRpcProvider {
    if (!this.providers.has(chainId)) {
      const rpcUrl = this.getRpcUrlForChainId(chainId);
      console.log('🔍 [BLOCKCHAIN_SERVICE] Creating provider for chain:', {
        chainId,
        rpcUrl,
        NODE_ENV: process.env.NODE_ENV
      });
      
      this.providers.set(chainId, new ethers.JsonRpcProvider(rpcUrl));
    }
    return this.providers.get(chainId)!;
  }

  /**
   * Check if an address has sufficient balance for a wager amount
   * @param address - The Ethereum address to check
   * @param wagerAmountWei - The wager amount in wei (BigInt)
   * @param chainId - The chain ID to check balance on
   * @returns Promise<boolean> - True if balance is sufficient
   */
  public async hasSufficientBalance(address: string, wagerAmountWei: bigint, chainId: number): Promise<boolean> {
    try {
      const provider = this.getProvider(chainId);
      const balance = await provider.getBalance(address);
      
      console.log('🔍 [BLOCKCHAIN_SERVICE] Balance check:', {
        address,
        chainId,
        balance: balance.toString(),
        wagerAmount: wagerAmountWei.toString(),
        sufficient: balance >= wagerAmountWei
      });

      return balance >= wagerAmountWei;
    } catch (error) {
      console.error('❌ [BLOCKCHAIN_SERVICE] Error checking balance:', error);
      throw new Error('Failed to check wallet balance');
    }
  }

  /**
   * Get the balance of an address in ETH
   * @param address - The Ethereum address to check
   * @param chainId - The chain ID to get balance from
   * @returns Promise<string> - Balance in ETH as a string
   */
  public async getBalanceInETH(address: string, chainId: number): Promise<string> {
    try {
      const provider = this.getProvider(chainId);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ [BLOCKCHAIN_SERVICE] Error getting balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Validate that the RPC connection is working for a specific chain
   * @param chainId - The chain ID to validate
   * @returns Promise<boolean> - True if RPC is accessible
   */
  public async validateRPCConnection(chainId: number): Promise<boolean> {
    try {
      const provider = this.getProvider(chainId);
      await provider.getBlockNumber();
      console.log('✅ [BLOCKCHAIN_SERVICE] RPC connection validated for chain:', chainId);
      return true;
    } catch (error) {
      console.error('❌ [BLOCKCHAIN_SERVICE] RPC connection failed for chain:', chainId, error);
      return false;
    }
  }

  /**
   * Validate that all supported RPC connections are working
   * @returns Promise<Record<number, boolean>> - Map of chainId to connection status
   */
  public async validateAllRPCConnections(): Promise<Record<number, boolean>> {
    const results: Record<number, boolean> = {};
    const supportedChains = [11155111, 84532]; // Ethereum Sepolia, Base Sepolia
    
    for (const chainId of supportedChains) {
      results[chainId] = await this.validateRPCConnection(chainId);
    }
    
    return results;
  }

  /**
   * Get the nonce for an address on a specific chain
   * @param address - The address to get nonce for
   * @param chainId - The chain ID to get nonce from
   * @returns Promise<number> - The nonce
   */
  public async getNonce(address: string, chainId: number): Promise<number> {
    try {
      const provider = this.getProvider(chainId);
      const nonce = await provider.getTransactionCount(address, 'pending');
      
      console.log('🔍 [BLOCKCHAIN_SERVICE] Got nonce:', {
        address,
        chainId,
        nonce
      });
      
      return nonce;
    } catch (error) {
      console.error('❌ [BLOCKCHAIN_SERVICE] Error getting nonce:', error);
      throw new Error('Failed to get nonce');
    }
  }

  /**
   * Craft a transaction to move wager from user to backend
   * @param fromAddress - User's address
   * @param toAddress - Backend's address (from mnemonic)
   * @param wagerAmountWei - Amount to transfer in wei
   * @param nonce - Transaction nonce
   * @param chainId - Chain ID
   * @returns Transaction object ready for signing
   */
  public craftEscrowTransaction(
    fromAddress: string,
    toAddress: string,
    wagerAmountWei: bigint,
    nonce: number,
    chainId: number
  ): any {
    const transaction = {
      to: toAddress,
      value: wagerAmountWei,
      nonce: nonce,
      gasLimit: 21000n, // Standard ETH transfer gas limit
      gasPrice: undefined, // Will be set by the network
      chainId: chainId,
      type: 2, // EIP-1559 transaction type
    };

    console.log('🔍 [BLOCKCHAIN_SERVICE] Crafted escrow transaction:', {
      from: fromAddress,
      to: toAddress,
      value: wagerAmountWei.toString(),
      nonce,
      chainId,
      gasLimit: transaction.gasLimit.toString()
    });

    return transaction;
  }

  /**
   * Submit a signed transaction and wait for confirmation
   * @param signedTransaction - The signed transaction
   * @param chainId - Chain ID
   * @returns Promise<{hash: string, receipt: any}> - Transaction hash and receipt
   */
  public async submitTransactionAndWait(
    signedTransaction: string,
    chainId: number
  ): Promise<{hash: string, receipt: any}> {
    try {
      const provider = this.getProvider(chainId);
      
      console.log('🔍 [BLOCKCHAIN_SERVICE] Submitting transaction...');
      const txResponse = await provider.broadcastTransaction(signedTransaction);
      
      console.log('🔍 [BLOCKCHAIN_SERVICE] Transaction submitted:', {
        hash: txResponse.hash,
        chainId
      });

      console.log('🔍 [BLOCKCHAIN_SERVICE] Waiting for confirmation...');
      const receipt = await txResponse.wait();
      
      console.log('✅ [BLOCKCHAIN_SERVICE] Transaction confirmed:', {
        hash: txResponse.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        status: receipt?.status
      });

      return {
        hash: txResponse.hash,
        receipt
      };
    } catch (error) {
      console.error('❌ [BLOCKCHAIN_SERVICE] Error submitting transaction:', error);
      throw new Error('Failed to submit transaction');
    }
  }

  /**
   * Get the backend's address from the mnemonic
   * @returns string - The backend's Ethereum address
   */
  public getBackendAddress(): string {
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) {
      throw new Error('MNEMONIC environment variable is not set');
    }

    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      const address = wallet.address;
      
      console.log('🔍 [BLOCKCHAIN_SERVICE] Backend address:', address);
      return address;
    } catch (error) {
      console.error('❌ [BLOCKCHAIN_SERVICE] Error getting backend address:', error);
      throw new Error('Failed to get backend address from mnemonic');
    }
  }
}
