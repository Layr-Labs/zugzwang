export interface Game {
  id: string;
  owner: string;
  opponent: string | null;
  wager: string;
  state: 'CREATED' | 'WAITING' | 'STARTED' | 'SETTLED';
  networkType: 'EVM' | 'SOL';
  chainId?: number;
  createdAt: string;
  startedAt?: string;
  settledAt?: string;
  winner?: 'white' | 'black';
}
