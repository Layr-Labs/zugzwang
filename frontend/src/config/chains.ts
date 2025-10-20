export interface ChainConfig {
  id: number;
  name: string;
  networkType: 'EVM' | 'SOL';
  rpcUrl?: string;
  blockExplorerUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface NetworkOption {
  value: string;
  label: string;
  networkType: 'EVM' | 'SOL';
  chainId?: number;
  enabled: boolean;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 84532, // Base Sepolia testnet
    name: 'Base Sepolia',
    networkType: 'EVM',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  }
];

export const NETWORK_OPTIONS: NetworkOption[] = [
  {
    value: 'base-sepolia',
    label: 'Base Sepolia',
    networkType: 'EVM',
    chainId: 84532,
    enabled: true
  },
  {
    value: 'solana',
    label: 'Solana (Coming Soon)',
    networkType: 'SOL',
    enabled: false
  }
];

export const getChainById = (chainId: number): ChainConfig | undefined => {
  return SUPPORTED_CHAINS.find(chain => chain.id === chainId);
};

export const getNetworkOption = (value: string): NetworkOption | undefined => {
  return NETWORK_OPTIONS.find(option => option.value === value);
};

export const getChainName = (networkType: string, chainId?: number): string => {
  console.log('🔍 GET CHAIN NAME DEBUG - networkType:', networkType, 'chainId:', chainId);
  
  if (networkType === 'SOL') {
    return 'Solana';
  }
  
  if (chainId) {
    const chain = getChainById(chainId);
    console.log('🔍 GET CHAIN NAME DEBUG - Found chain:', chain);
    return chain ? chain.name : `Chain ${chainId}`;
  }
  
  console.log('🔍 GET CHAIN NAME DEBUG - Returning Unknown Chain');
  return 'Unknown Chain';
};
