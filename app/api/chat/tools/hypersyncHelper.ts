import { HypersyncClient, Decoder, BlockField, LogField, TransactionField, Query } from "@envio-dev/hypersync-client";
import { ethers } from 'ethers';

export interface TokenBalance {
  token: string;
  balance: bigint;
  symbol?: string;
  decimals?: number;
}

export interface NFTBalance {
  contractAddress: string;
  tokenId: string;
  standard: 'ERC721' | 'ERC1155';
  balance: bigint;
}

interface ChainConfig {
  name: string;
  url: string;
  supportsTraces: boolean;
}

interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

interface DexSwap {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
  sender: string;
  recipient: string;
}

interface WalletActivity {
  transactions: any[];
  tokenTransfers: any[];
  contractInteractions: any[];
}

interface PoolStats {
  address: string;
  token0: string;
  token1: string;
  reserves: [bigint, bigint];
  totalSupply: bigint;
  swaps: DexSwap[];
  volumeUSD: number;
}

export class HypersyncHelper {
  private static clients: Map<number, HypersyncClient> = new Map();
  private static decoder: Decoder;
  private static readonly ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  private static readonly ERC721_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  private static readonly ERC1155_TRANSFER_SINGLE_TOPIC = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
  private static readonly ERC1155_TRANSFER_BATCH_TOPIC = "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb";

  private static readonly SUPPORTED_CHAINS: Record<number, ChainConfig> = {
    1: { name: 'Ethereum Mainnet', url: 'https://eth.hypersync.xyz', supportsTraces: true },
    10: { name: 'Optimism', url: 'https://optimism.hypersync.xyz', supportsTraces: false },
    14: { name: 'Flare', url: 'https://flare.hypersync.xyz', supportsTraces: false },
    30: { name: 'Rootstock', url: 'https://rootstock.hypersync.xyz', supportsTraces: false },
    42: { name: 'Lukso', url: 'https://lukso.hypersync.xyz', supportsTraces: false },
    44: { name: 'Crab', url: 'https://crab.hypersync.xyz', supportsTraces: false },
    46: { name: 'Darwinia', url: 'https://darwinia.hypersync.xyz', supportsTraces: true },
    56: { name: 'BSC', url: 'https://bsc.hypersync.xyz', supportsTraces: false },
    97: { name: 'BSC Testnet', url: 'https://bsc-testnet.hypersync.xyz', supportsTraces: false },
    100: { name: 'Gnosis', url: 'https://gnosis.hypersync.xyz', supportsTraces: false },
    130: { name: 'Unichain', url: 'https://unichain.hypersync.xyz', supportsTraces: false },
    137: { name: 'Polygon', url: 'https://polygon.hypersync.xyz', supportsTraces: false },
    148: { name: 'Shimmer EVM', url: 'https://shimmer-evm.hypersync.xyz', supportsTraces: false },
    169: { name: 'Manta', url: 'https://manta.hypersync.xyz', supportsTraces: false },
    204: { name: 'opBNB', url: 'https://opbnb.hypersync.xyz', supportsTraces: false },
    250: { name: 'Fantom', url: 'https://fantom.hypersync.xyz', supportsTraces: false },
    252: { name: 'Fraxtal', url: 'https://fraxtal.hypersync.xyz', supportsTraces: false },
    255: { name: 'Kroma', url: 'https://kroma.hypersync.xyz', supportsTraces: false },
    288: { name: 'Boba', url: 'https://boba.hypersync.xyz', supportsTraces: false },
    324: { name: 'ZKSync', url: 'https://zksync.hypersync.xyz', supportsTraces: false },
    1088: { name: 'Metis', url: 'https://metis.hypersync.xyz', supportsTraces: false },
    1101: { name: 'Polygon zkEVM', url: 'https://polygon-zkevm.hypersync.xyz', supportsTraces: false },
    1135: { name: 'Lisk', url: 'https://lisk.hypersync.xyz', supportsTraces: false },
    1284: { name: 'Moonbeam', url: 'https://moonbeam.hypersync.xyz', supportsTraces: false },
    1287: { name: 'Moonbase Alpha', url: 'https://moonbase-alpha.hypersync.xyz', supportsTraces: false },
    1301: { name: 'Unichain Sepolia', url: 'https://unichain-sepolia.hypersync.xyz', supportsTraces: false },
    1750: { name: 'Metall2', url: 'https://metall2.hypersync.xyz', supportsTraces: false },
    1868: { name: 'Soneium', url: 'https://soneium.hypersync.xyz', supportsTraces: false },
    2818: { name: 'Morph', url: 'https://morph.hypersync.xyz', supportsTraces: false },
    4200: { name: 'Merlin', url: 'https://merlin.hypersync.xyz', supportsTraces: false },
    4201: { name: 'Lukso Testnet', url: 'https://lukso-testnet.hypersync.xyz', supportsTraces: false },
    5000: { name: 'Mantle', url: 'https://mantle.hypersync.xyz', supportsTraces: false },
    5115: { name: 'Citrea Testnet', url: 'https://citrea-testnet.hypersync.xyz', supportsTraces: false },
    7000: { name: 'Zeta', url: 'https://zeta.hypersync.xyz', supportsTraces: false },
    7560: { name: 'Cyber', url: 'https://cyber.hypersync.xyz', supportsTraces: false },
    8453: { name: 'Base', url: 'https://base.hypersync.xyz', supportsTraces: false },
    8888: { name: 'Chiliz', url: 'https://chiliz.hypersync.xyz', supportsTraces: false },
    10143: { name: 'Monad Testnet', url: 'https://monad-testnet.hypersync.xyz', supportsTraces: false },
    10200: { name: 'Gnosis Chiado', url: 'https://gnosis-chiado.hypersync.xyz', supportsTraces: false },
    11155111: { name: 'Sepolia', url: 'https://sepolia.hypersync.xyz', supportsTraces: false },
    11155420: { name: 'Optimism Sepolia', url: 'https://optimism-sepolia.hypersync.xyz', supportsTraces: false },
    17000: { name: 'Holesky', url: 'https://holesky.hypersync.xyz', supportsTraces: false },
    17864: { name: 'MEV Commit', url: 'https://mev-commit.hypersync.xyz', supportsTraces: false },
    34443: { name: 'Mode', url: 'https://mode.hypersync.xyz', supportsTraces: false },
    42161: { name: 'Arbitrum', url: 'https://arbitrum.hypersync.xyz', supportsTraces: false },
    42170: { name: 'Arbitrum Nova', url: 'https://arbitrum-nova.hypersync.xyz', supportsTraces: false },
    42220: { name: 'Celo', url: 'https://celo.hypersync.xyz', supportsTraces: false },
    43114: { name: 'Avalanche', url: 'https://avalanche.hypersync.xyz', supportsTraces: false },
    43113: { name: 'Fuji', url: 'https://fuji.hypersync.xyz', supportsTraces: false },
    48900: { name: 'Zircuit', url: 'https://zircuit.hypersync.xyz', supportsTraces: false },
    50104: { name: 'Sophon', url: 'https://sophon.hypersync.xyz', supportsTraces: false },
    57073: { name: 'Ink', url: 'https://ink.hypersync.xyz', supportsTraces: false },
    59144: { name: 'Linea', url: 'https://linea.hypersync.xyz', supportsTraces: false },
    80002: { name: 'Polygon Amoy', url: 'https://polygon-amoy.hypersync.xyz', supportsTraces: false },
    80084: { name: 'Berachain Bartio', url: 'https://berachain-bartio.hypersync.xyz', supportsTraces: false },
    80094: { name: 'Berachain', url: 'https://berachain.hypersync.xyz', supportsTraces: false },
    81457: { name: 'Blast', url: 'https://blast.hypersync.xyz', supportsTraces: false },
    84532: { name: 'Base Sepolia', url: 'https://base-sepolia.hypersync.xyz', supportsTraces: false },
    168587773: { name: 'Blast Sepolia', url: 'https://blast-sepolia.hypersync.xyz', supportsTraces: false },
    283027429: { name: 'Extrabud', url: 'https://extrabud.hypersync.xyz', supportsTraces: false },
    421614: { name: 'Arbitrum Sepolia', url: 'https://arbitrum-sepolia.hypersync.xyz', supportsTraces: false },
    531050104: { name: 'Sophon Testnet', url: 'https://sophon-testnet.hypersync.xyz', supportsTraces: false },
    534352: { name: 'Scroll', url: 'https://scroll.hypersync.xyz', supportsTraces: false },
    696969: { name: 'Galadriel Devnet', url: 'https://galadriel-devnet.hypersync.xyz', supportsTraces: false },
    1313161554: { name: 'Aurora', url: 'https://aurora.hypersync.xyz', supportsTraces: false },
    1666600000: { name: 'Harmony Shard 0', url: 'https://harmony-shard-0.hypersync.xyz', supportsTraces: false },
    7225878: { name: 'Saakuru', url: 'https://saakuru.hypersync.xyz', supportsTraces: false },
    7777777: { name: 'Zora', url: 'https://zora.hypersync.xyz', supportsTraces: false },
  };

  private static readonly ERC20_INTERFACES = {
    name: '0x06fdde03',
    symbol: '0x95d89b41',
    decimals: '0x313ce567',
    totalSupply: '0x18160ddd',
  };

  private static readonly SWAP_EVENT_SIGNATURES = [
    'Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
    'Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
  ];

  static initialize(chainId: number) {
    if (!this.SUPPORTED_CHAINS[chainId]) {
      throw new Error(`Chain ID ${chainId} is not supported`);
    }

    if (!this.clients.has(chainId)) {
      this.clients.set(
        chainId,
        HypersyncClient.new({
          url: this.SUPPORTED_CHAINS[chainId].url,
          bearerToken: process.env.HYPERSYNC_API_KEY || "your_api_key"
        })
      );

      if (!this.decoder) {
        this.decoder = Decoder.fromSignatures([
          "Transfer(address indexed from, address indexed to, uint256 amount)",
          "Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
          "TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
          "TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
          "Approval(address indexed owner, address indexed spender, uint256 value)",
          "ApprovalForAll(address indexed owner, address indexed operator, bool approved)"
        ]);
      }
    }
  }

  static getClient(chainId: number): HypersyncClient {
    const client = this.clients.get(chainId);
    if (!client) {
      throw new Error(`Client for chain ID ${chainId} not initialized`);
    }
    return client;
  }

  static async getTransactionDetails(chainId: number, txHash: string) {
    this.initialize(chainId);
    const query: Query = {
      fromBlock: 0,
      fieldSelection: {
        transaction: Object.values(TransactionField),
        block: Object.values(BlockField),
        log: Object.values(LogField)
      },
      transactions: [{
        hash: [txHash]
      }]
    };

    const response = await this.getClient(chainId).get(query);
    return response.data;
  }

  static async getTokenBalances(chainId: number, walletAddress: string, fromBlock?: number): Promise<TokenBalance[]> {
    this.initialize(chainId);
    const paddedAddress = ethers.zeroPadValue(walletAddress.toLowerCase(), 32);
    
    const query: Query = {
      fromBlock: fromBlock || 0,
      fieldSelection: {
        log: [LogField.Address, LogField.Data, LogField.Topic0, LogField.Topic1, LogField.Topic2, LogField.BlockNumber],
        block: [BlockField.Timestamp]
      },
      logs: [{
        topics: [
          [this.ERC20_TRANSFER_TOPIC],
          null,
          [paddedAddress]
        ]
      }]
    };

    const response = await this.getClient(chainId).get(query);
    const decodedLogs = await this.decoder.decodeLogs(response.data.logs);
    
    const balances = new Map<string, bigint>();
    for (const log of decodedLogs) {
      if (!log) continue;
      const token = log.address;
      const amount = log.body[0].val as bigint;
      balances.set(token, (balances.get(token) || BigInt(0)) + amount);
    }

    return Array.from(balances.entries()).map(([token, balance]) => ({
      token,
      balance
    }));
  }

  static async getNFTBalances(chainId: number, walletAddress: string, fromBlock?: number): Promise<NFTBalance[]> {
    this.initialize(chainId);
    const paddedAddress = ethers.zeroPadValue(walletAddress.toLowerCase(), 32);
    
    const query: Query = {
      fromBlock: fromBlock || 0,
      fieldSelection: {
        log: Object.values(LogField),
        block: [BlockField.Timestamp]
      },
      logs: [
        {
          topics: [[this.ERC721_TRANSFER_TOPIC], null, [paddedAddress]]
        },
        {
          topics: [[this.ERC1155_TRANSFER_SINGLE_TOPIC, this.ERC1155_TRANSFER_BATCH_TOPIC], null, [paddedAddress]]
        }
      ]
    };

    const response = await this.getClient(chainId).get(query);
    const decodedLogs = await this.decoder.decodeLogs(response.data.logs);
    
    const nftBalances = new Map<string, NFTBalance>();
    
    for (const log of decodedLogs) {
      if (!log) continue;
      
      if (log.topic0 === this.ERC721_TRANSFER_TOPIC) {
        const key = `${log.address}-${log.body[0]}`;
        nftBalances.set(key, {
          contractAddress: log.address,
          tokenId: log.body[0].toString(),
          standard: 'ERC721',
          balance: BigInt(1)
        });
      } else if (log.topic0 === this.ERC1155_TRANSFER_SINGLE_TOPIC) {
        const key = `${log.address}-${log.body[0]}`;
        nftBalances.set(key, {
          contractAddress: log.address,
          tokenId: log.body[0].toString(),
          standard: 'ERC1155',
          balance: log.body[1] as bigint
        });
      }
    }

    return Array.from(nftBalances.values());
  }

  static async getContractEvents(
    chainId: number,
    contractAddress: string,
    eventSignature: string,
    fromBlock?: number,
    toBlock?: number
  ) {
    this.initialize(chainId);
    const eventTopic = ethers.id(eventSignature);
    
    const query: Query = {
      fromBlock: fromBlock || 0,
      toBlock,
      fieldSelection: {
        log: Object.values(LogField),
        block: [BlockField.Timestamp, BlockField.Number],
        transaction: [TransactionField.Hash]
      },
      logs: [{
        address: [contractAddress],
        topics: [[eventTopic]]
      }]
    };

    const response = await this.getClient(chainId).get(query);
    return response.data;
  }

  static async getBlockRange(chainId: number, fromBlock: number, toBlock: number) {
    this.initialize(chainId);
    const query: Query = {
      fromBlock,
      toBlock,
      fieldSelection: {
        block: Object.values(BlockField),
        transaction: Object.values(TransactionField)
      }
    };

    const response = await this.getClient(chainId).get(query);
    return response.data;
  }

  static async getLatestBlockNumber(chainId: number): Promise<number> {
    this.initialize(chainId);
    const query: Query = {
      fromBlock: 0,
      fieldSelection: {
        block: [BlockField.Number]
      }
    };

    const response = await this.getClient(chainId).get(query);
    return response.archiveHeight;
  }

  static getSupportedChains(): Record<number, ChainConfig> {
    return this.SUPPORTED_CHAINS;
  }

  static async getTokenMetadata(chainId: number, tokenAddress: string): Promise<TokenMetadata> {
    this.initialize(chainId);
    
    const queries = Object.entries(this.ERC20_INTERFACES).map(([field, selector]) => ({
      fromBlock: 0,
      toBlock: 1, 
      fieldSelection: {
        transaction: [TransactionField.Input, TransactionField.To, TransactionField.Output],
      },
      transactions: [{
        to: [tokenAddress],
        input: [selector]
      }]
    }));

    try {
      // Execute all queries in parallel
      const responses = await Promise.all(
        queries.map(query => this.getClient(chainId).get(query))
      );

      // Initialize default values
      let name = 'Unknown';
      let symbol = 'UNKNOWN';
      let decimals = 18;
      let totalSupply = BigInt(0);

      // Process each response
      responses.forEach((response, index) => {
        const [field] = Object.keys(this.ERC20_INTERFACES)[index];
        const output = response.data.transactions?.[0]?.output;

        if (output && output !== '0x') {
          try {
            // Remove '0x' prefix and decode based on field type
            const cleanOutput = output.slice(2);
            
            switch (field) {
              case 'name':
              case 'symbol': {
                // String values are encoded with offset (32 bytes) and length
                const length = parseInt(cleanOutput.slice(64, 128), 16);
                const stringData = cleanOutput.slice(128, 128 + length * 2);
                const value = Buffer.from(stringData, 'hex').toString('utf8');
                if (field === 'name') name = value;
                if (field === 'symbol') symbol = value;
                break;
              }
              case 'decimals': {
                // Decimals is a uint8
                decimals = parseInt(cleanOutput.slice(0, 64), 16);
                break;
              }
              case 'totalSupply': {
                // Total supply is a uint256
                totalSupply = BigInt('0x' + cleanOutput.slice(0, 64));
                break;
              }
            }
          } catch (error) {
            console.warn(`Failed to decode ${field} for token ${tokenAddress}:`, error);
          }
        }
      });

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply
      };
    } catch (error) {
      throw new Error(`Failed to fetch token metadata: ${error.message}`);
    }
  }

  static async getDexSwaps(
    chainId: number,
    dexAddress: string,
    fromBlock?: number,
    toBlock?: number,
    tokenAddress?: string
  ): Promise<DexSwap[]> {
    this.initialize(chainId);
    const swapTopics = this.SWAP_EVENT_SIGNATURES.map(sig => ethers.id(sig));
    
    const query: Query = {
      fromBlock: fromBlock || 0,
      toBlock,
      fieldSelection: {
        log: Object.values(LogField),
        block: [BlockField.Timestamp],
        transaction: [TransactionField.Hash]
      },
      logs: [{
        address: [dexAddress],
        topics: [[...swapTopics]]
      }]
    };

    const response = await this.getClient(chainId).get(query);
    const decodedLogs = await this.decoder.decodeLogs(response.data.logs);
    
    // Process and return swap events
    return decodedLogs.map(log => ({
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp: log.timestamp,
      tokenIn: log.address,
      tokenOut: log.address,
      amountIn: BigInt(0),
      amountOut: BigInt(0),
      sender: '0x',
      recipient: '0x'
    }));
  }

  static async getWalletActivity(
    chainId: number,
    walletAddress: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<WalletActivity> {
    this.initialize(chainId);
    const paddedAddress = ethers.zeroPadValue(walletAddress.toLowerCase(), 32);
    
    const query: Query = {
      fromBlock: fromBlock || 0,
      toBlock,
      fieldSelection: {
        transaction: Object.values(TransactionField),
        log: Object.values(LogField),
        block: [BlockField.Timestamp]
      },
      transactions: [{
        from: [walletAddress]
      }],
      logs: [{
        topics: [null, [paddedAddress]]
      }]
    };

    const response = await this.getClient(chainId).get(query);
    // Process and categorize wallet activity
    return {
      transactions: response.data.transactions || [],
      tokenTransfers: [],
      contractInteractions: []
    };
  }

  static async getLiquidityPoolStats(
    chainId: number,
    poolAddress: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<PoolStats> {
    this.initialize(chainId);
    
    const query: Query = {
      fromBlock: fromBlock || 0,
      toBlock,
      fieldSelection: {
        log: Object.values(LogField),
        block: [BlockField.Timestamp],
        transaction: [TransactionField.Hash]
      },
      logs: [{
        address: [poolAddress]
      }]
    };

    const response = await this.getClient(chainId).get(query);
    // Process pool data and statistics
    return {
      address: poolAddress,
      token0: '0x',
      token1: '0x',
      reserves: [BigInt(0), BigInt(0)],
      totalSupply: BigInt(0),
      swaps: [],
      volumeUSD: 0
    };
  }
} 