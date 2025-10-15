import { ethers } from 'ethers';
import { BlockchainService } from './BlockchainService';
import { GameLobby } from './GameLobby';
import { NetworkType } from '../types/Game';
import fs from 'fs';
import path from 'path';

interface ChessEscrowMetadata {
  address: string;
  chainId: number;
  network: string;
}

interface GameCreatedEvent {
  gameId: string;
  creator: string;
  opponent: string;
  wagerAmount: bigint;
  blockNumber: number;
  transactionHash: string;
}

export class EventPollingService {
  private blockchainService: BlockchainService;
  private gameLobby: GameLobby;
  private contract: ethers.Contract;
  private contractAddress: string;
  private chainId: number = 84532; // Base Sepolia
  private isPolling: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedBlock: number = 0;
  private readonly POLLING_INTERVAL_MS = 10000; // 10 seconds

  constructor(blockchainService: BlockchainService, gameLobby: GameLobby) {
    this.blockchainService = blockchainService;
    this.gameLobby = gameLobby;
    
    // Load contract metadata
    const metadataPath = path.join(__dirname, '../contracts/ChessEscrowMetadata.json');
    const metadata: ChessEscrowMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    this.contractAddress = metadata.address;
    this.chainId = metadata.chainId;

    // Load ABI
    const abiPath = path.join(__dirname, '../contracts/ChessEscrow.json');
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    // Create contract instance
    const provider = this.blockchainService.getProvider(this.chainId);
    this.contract = new ethers.Contract(this.contractAddress, abi, provider);

    console.log(`🔍 [EVENT_POLLING] Initialized for contract ${this.contractAddress} on chain ${this.chainId}`);
  }

  async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log('⚠️ [EVENT_POLLING] Already polling, ignoring start request');
      return;
    }

    try {
      // Get the current block number to start from
      const provider = this.blockchainService.getProvider(this.chainId);
      this.lastProcessedBlock = await provider.getBlockNumber();
      
      console.log(`🚀 [EVENT_POLLING] Starting event polling from block ${this.lastProcessedBlock}`);
      
      this.isPolling = true;
      this.pollingInterval = setInterval(() => {
        this.pollEvents().catch(error => {
          console.error('❌ [EVENT_POLLING] Error during polling:', error);
        });
      }, this.POLLING_INTERVAL_MS);

      // Poll immediately
      await this.pollEvents();
      
    } catch (error) {
      console.error('❌ [EVENT_POLLING] Failed to start polling:', error);
      throw error;
    }
  }

  async stopPolling(): Promise<void> {
    if (!this.isPolling) {
      return;
    }

    console.log('🛑 [EVENT_POLLING] Stopping event polling');
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isPolling = false;
  }

  private async pollEvents(): Promise<void> {
    try {
      const provider = this.blockchainService.getProvider(this.chainId);
      const currentBlock = await provider.getBlockNumber();
      
      if (currentBlock <= this.lastProcessedBlock) {
        return; // No new blocks
      }

      console.log(`🔍 [EVENT_POLLING] Polling blocks ${this.lastProcessedBlock + 1} to ${currentBlock}`);

      // Get GameCreated events
      const gameCreatedFilter = this.contract.filters.GameCreated();
      const events = await this.contract.queryFilter(
        gameCreatedFilter,
        this.lastProcessedBlock + 1,
        currentBlock
      );

      console.log(`📋 [EVENT_POLLING] Found ${events.length} GameCreated events`);

      for (const event of events) {
        await this.processGameCreatedEvent(event);
      }

      this.lastProcessedBlock = currentBlock;
      
    } catch (error) {
      console.error('❌ [EVENT_POLLING] Error polling events:', error);
    }
  }

  private async processGameCreatedEvent(event: any): Promise<void> {
    try {
      const gameCreatedEvent: GameCreatedEvent = {
        gameId: event.args.gameId,
        creator: event.args.creator,
        opponent: event.args.opponent,
        wagerAmount: event.args.wagerAmount,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };

      console.log(`🎮 [EVENT_POLLING] Processing GameCreated event:`, {
        gameId: gameCreatedEvent.gameId,
        creator: gameCreatedEvent.creator,
        opponent: gameCreatedEvent.opponent,
        wagerAmount: ethers.formatEther(gameCreatedEvent.wagerAmount),
        blockNumber: gameCreatedEvent.blockNumber
      });

      // Create game in the lobby
      const game = await this.gameLobby.createGameFromEvent({
        id: gameCreatedEvent.gameId,
        creator: gameCreatedEvent.creator,
        opponent: gameCreatedEvent.opponent === ethers.ZeroAddress ? null : gameCreatedEvent.opponent,
        wagerAmount: gameCreatedEvent.wagerAmount.toString(),
        networkType: NetworkType.EVM,
        chainId: this.chainId,
        status: 'waiting',
        createdAt: new Date(),
        escrow: {
          contractAddress: this.contractAddress,
          transactionHash: gameCreatedEvent.transactionHash,
          blockNumber: gameCreatedEvent.blockNumber
        }
      });

      console.log(`✅ [EVENT_POLLING] Game created from event: ${game.id}`);

    } catch (error) {
      console.error('❌ [EVENT_POLLING] Error processing GameCreated event:', error);
    }
  }

  async getPollingStatus(): Promise<{
    isPolling: boolean;
    lastProcessedBlock: number;
    contractAddress: string;
    chainId: number;
  }> {
    return {
      isPolling: this.isPolling,
      lastProcessedBlock: this.lastProcessedBlock,
      contractAddress: this.contractAddress,
      chainId: this.chainId
    };
  }
}
