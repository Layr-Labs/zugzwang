import { ethers } from 'ethers';
import { BlockchainService } from './BlockchainService';
import { GameLobby } from './GameLobby';
import { NetworkType, GameState } from '../types/Game';
import fs from 'fs';
import path from 'path';

interface ChessEscrowMetadata {
  address: string;
  chainId: number;
  network: string;
}

interface GameCreatedEvent {
  gameId: string;
  gameIdHash: string;
  creator: string;
  opponent?: string; // Optional since it's not emitted in the event
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
  private readonly POLLING_INTERVAL_MS = 2000; // 2 seconds

  constructor(blockchainService: BlockchainService, gameLobby: GameLobby) {
    this.blockchainService = blockchainService;
    this.gameLobby = gameLobby;
    
    // Load contract metadata - try multiple paths for Docker compatibility
    const metadataPaths = [
      path.join(__dirname, '../contracts/ChessEscrowMetadata.json'), // dist/contracts/
      path.join(__dirname, '../../src/contracts/ChessEscrowMetadata.json'), // src/contracts/ from dist/
      path.join(process.cwd(), 'src/contracts/ChessEscrowMetadata.json'), // src/contracts/ from project root
    ];
    
    let metadata: ChessEscrowMetadata;
    let metadataPath: string;
    
    for (const testPath of metadataPaths) {
      try {
        if (fs.existsSync(testPath)) {
          metadata = JSON.parse(fs.readFileSync(testPath, 'utf8'));
          metadataPath = testPath;
          console.log(`📁 [EVENT_POLLING] Loaded metadata from: ${testPath}`);
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    if (!metadata!) {
      throw new Error(`Could not find ChessEscrowMetadata.json in any of these paths: ${metadataPaths.join(', ')}`);
    }
    
    this.contractAddress = metadata.address;
    this.chainId = metadata.chainId;

    // Load ABI - try multiple paths for Docker compatibility
    const abiPaths = [
      path.join(__dirname, '../contracts/ChessEscrow.json'), // dist/contracts/
      path.join(__dirname, '../../src/contracts/ChessEscrow.json'), // src/contracts/ from dist/
      path.join(process.cwd(), 'src/contracts/ChessEscrow.json'), // src/contracts/ from project root
    ];
    
    let abi: any;
    let abiPath: string;
    
    for (const testPath of abiPaths) {
      try {
        if (fs.existsSync(testPath)) {
          abi = JSON.parse(fs.readFileSync(testPath, 'utf8'));
          abiPath = testPath;
          console.log(`📁 [EVENT_POLLING] Loaded ABI from: ${testPath}`);
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    if (!abi!) {
      throw new Error(`Could not find ChessEscrow.json in any of these paths: ${abiPaths.join(', ')}`);
    }

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
      const gameCreatedEvents = await this.contract.queryFilter(
        gameCreatedFilter,
        this.lastProcessedBlock + 1,
        currentBlock
      );

      console.log(`📋 [EVENT_POLLING] Found ${gameCreatedEvents.length} GameCreated events`);

      for (const event of gameCreatedEvents) {
        await this.processGameCreatedEvent(event);
      }

      // Get GameJoined events
      const gameJoinedFilter = this.contract.filters.GameJoined();
      const gameJoinedEvents = await this.contract.queryFilter(
        gameJoinedFilter,
        this.lastProcessedBlock + 1,
        currentBlock
      );

      console.log(`📋 [EVENT_POLLING] Found ${gameJoinedEvents.length} GameJoined events`);

      for (const event of gameJoinedEvents) {
        await this.processGameJoinedEvent(event);
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
        gameIdHash: event.args.gameIdHash,
        creator: event.args.creator,
        opponent: event.args.opponent, // This will be undefined since it's not emitted
        wagerAmount: event.args.wagerAmount,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };

      console.log(`🎮 [EVENT_POLLING] Processing GameCreated event:`, {
        gameId: gameCreatedEvent.gameId,
        creator: gameCreatedEvent.creator,
        wagerAmount: ethers.formatEther(gameCreatedEvent.wagerAmount),
        blockNumber: gameCreatedEvent.blockNumber
      });

      // Query the contract to get the full game details including opponent
      let opponentAddress: string | null = null;
      try {
        console.log(`🔍 [EVENT_POLLING] Querying contract for game details: ${gameCreatedEvent.gameId}`);
        const gameData = await this.contract.getGame(gameCreatedEvent.gameId);
        opponentAddress = gameData.opponent === ethers.ZeroAddress ? null : gameData.opponent;
        console.log(`📊 [EVENT_POLLING] Retrieved game data from contract:`, {
          gameId: gameData.gameId,
          creator: gameData.creator,
          opponent: opponentAddress,
          wagerAmount: ethers.formatEther(gameData.wagerAmount),
          creatorPaid: gameData.creatorPaid,
          opponentPaid: gameData.opponentPaid,
          settled: gameData.settled
        });
      } catch (contractError) {
        console.error(`❌ [EVENT_POLLING] Failed to query contract for game ${gameCreatedEvent.gameId}:`, contractError);
        // Continue with null opponent - the game will be treated as open
        opponentAddress = null;
      }

      // Create game in the lobby
      const game = await this.gameLobby.createGameFromEvent({
        id: gameCreatedEvent.gameId,
        creator: gameCreatedEvent.creator,
        opponent: opponentAddress,
        wagerAmount: gameCreatedEvent.wagerAmount.toString(),
        networkType: NetworkType.EVM,
        chainId: this.chainId,
        status: 'waiting', // All games start as 'waiting' - open games are waiting for any opponent
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

  private async processGameJoinedEvent(event: any): Promise<void> {
    try {
      const gameJoinedEvent = {
        gameId: event.args.gameId,
        gameIdHash: event.args.gameIdHash,
        joiner: event.args.joiner,
        wagerAmount: event.args.wagerAmount,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };

      console.log(`🎮 [EVENT_POLLING] Processing GameJoined event:`, {
        gameId: gameJoinedEvent.gameId,
        joiner: gameJoinedEvent.joiner,
        wagerAmount: ethers.formatEther(gameJoinedEvent.wagerAmount),
        blockNumber: gameJoinedEvent.blockNumber
      });

      // Update game state to STARTED
      const game = this.gameLobby.getGame(gameJoinedEvent.gameId);
      if (game) {
        // Update opponent and state
        game.opponent = gameJoinedEvent.joiner;
        game.state = GameState.STARTED;
        game.startedAt = new Date();
        
        console.log(`✅ [EVENT_POLLING] Game ${game.id} updated to STARTED state with opponent ${gameJoinedEvent.joiner}`);
      } else {
        console.warn(`⚠️ [EVENT_POLLING] Game ${gameJoinedEvent.gameId} not found in lobby for GameJoined event`);
      }

    } catch (error) {
      console.error('❌ [EVENT_POLLING] Error processing GameJoined event:', error);
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
