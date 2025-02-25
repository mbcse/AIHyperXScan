import { ethers } from 'ethers';

export interface Chain {
    name: string;
    chainId: number;
    shortName?: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpc: string[];
}
  
  // Chain data management
 export class ChainManager {
    private static instance: ChainManager;
    private chains: Chain[] = [];
    private readonly CHAINLIST_URL = 'https://chainid.network/chains.json';
    private readonly CUSTOM_CHAINS: Chain[] = [
      {
        name: 'Polygon zkEVM',
        chainId: 1101,
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        rpc: [
          'https://zkevm-rpc.com',
          'https://rpc.polygon-zkevm.gateway.fm'
        ]
      },
      {
        name: 'Base',
        chainId: 8453,
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        rpc: [
          'https://mainnet.base.org',
          'https://base.gateway.tenderly.co',
          'https://base.publicnode.com'
        ]
      }
    ];
  
    private constructor() {}
  
    static getInstance(): ChainManager {
      if (!ChainManager.instance) {
        ChainManager.instance = new ChainManager();
      }
      return ChainManager.instance;
    }
  
    private async fetchChains(chainId?: any) {
      console.log('Fetching chains...');
      try {
        const response = await fetch(this.CHAINLIST_URL);
        if (!response.ok) throw new Error('Failed to fetch chain data');
        this.chains = await response.json();
        
        // Add custom chains
        this.chains = [...this.chains, ...this.CUSTOM_CHAINS];

        if(chainId){
          this.chains = this.chains.filter(chain => chain.chainId === chainId);
        }else{
          // Filter out chains without RPC endpoints
          this.chains = this.chains.filter(chain => chain.rpc && chain.rpc.length > 0);
        }
        // Clean RPC URLs
        this.chains = this.chains.map(chain => ({
          ...chain,
          rpc: chain.rpc.filter(url => 
            !url.includes('${INFURA_API_KEY}') &&
            !url.includes('${ALCHEMY_API_KEY}') &&
            !url.includes('INFURA_API_KEY') &&
            !url.includes('ALCHEMY_API_KEY') &&
            !url.includes('API_KEY') &&
            !url.includes('api-key') &&
            !url.includes('https://cloudflare-eth.com') &&
            !url.includes('https://ethereum-rpc.publicnode.com')
          )
        }));
  
        console.log(`Fetched ${this.chains.length} chains`);
      } catch (error) {
        console.error('Error fetching chains:', error);
        throw error;
      }
    }
  
    async getChain(chainId: number): Promise<Chain | undefined> {
      if (this.chains.length === 0) {
        await this.fetchChains(chainId);
      }
      return this.chains.find(chain => chain.chainId === chainId);
    }
  
    async getProvider(chainId: number): Promise<ethers.JsonRpcProvider> {
      const chain = await this.getChain(chainId);
      if (!chain) throw new Error(`Chain ${chainId} not found`);
      if (!chain.rpc || chain.rpc.length === 0) throw new Error(`No RPC endpoints found for chain ${chainId}`);
  
      const errors: Error[] = [];
      for (const rpc of chain.rpc) {
        try {
          console.log(`Trying RPC: ${rpc}`);
          const provider = new ethers.JsonRpcProvider(rpc);
          // Test the connection
          await provider.getBlockNumber();
          console.log(`Successfully connected to RPC: ${rpc}`);
          return provider;
        } catch (error) {
          console.warn(`RPC ${rpc} failed:`, error);
          errors.push(error as Error);
          continue;
        }
      }
      throw new Error(`All RPCs failed for chain ${chainId}. Errors: ${errors.map(e => e.message).join(', ')}`);
    }
  }