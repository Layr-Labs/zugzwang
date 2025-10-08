export interface Game {
  id: string;
  owner: string;
  opponent: string | null;
  wager: string;
  state: 'CREATED' | 'STARTED' | 'SETTLED';
  createdAt: string;
  startedAt?: string;
  settledAt?: string;
  winner?: 'white' | 'black';
}
