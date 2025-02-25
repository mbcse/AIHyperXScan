import { z } from 'zod';
import { tool } from 'ai';
import { HypersyncHelper } from './hypersyncHelper';

function serializeBigInts(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  if (obj && typeof obj === 'object') {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = serializeBigInts(value);
    }
    return newObj;
  }
  return obj;
}

export const getTransactionTool = tool({
  description: 'Get detailed information about a specific blockchain transaction',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    txHash: z.string().describe('The transaction hash to analyze'),
  }),
  execute: async ({ chainId, txHash }) => {
    try {
      const txDetails = await HypersyncHelper.getTransactionDetails(chainId, txHash);
      const serializedTx = serializeBigInts(txDetails);
      return {
        success: true,
        data: JSON.stringify(serializedTx),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getTokenBalancesTool = tool({
  description: 'Get ERC20 token balances for a specific wallet address',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    walletAddress: z.string().describe('The wallet address to check'),
    fromBlock: z.number().optional().describe('Starting block number (optional)'),
  }),
  execute: async ({ chainId, walletAddress, fromBlock }) => {
    try {
      const balances = await HypersyncHelper.getTokenBalances(chainId, walletAddress, fromBlock);
      const serializedBalances = serializeBigInts(balances);
      return {
        success: true,
        data: JSON.stringify(serializedBalances),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getNFTBalancesTool = tool({
  description: 'Get NFT holdings (ERC721 and ERC1155) for a specific wallet address',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    walletAddress: z.string().describe('The wallet address to check'),
    fromBlock: z.number().optional().describe('Starting block number (optional)'),
  }),
  execute: async ({ chainId, walletAddress, fromBlock }) => {
    try {
      const nfts = await HypersyncHelper.getNFTBalances(chainId, walletAddress, fromBlock);
      const serializedNfts = serializeBigInts(nfts);
      return {
        success: true,
        data: JSON.stringify(serializedNfts),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getContractEventsTool = tool({
  description: 'Get events from a specific smart contract',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    contractAddress: z.string().describe('The contract address'),
    eventSignature: z.string().describe('The event signature (e.g., "Transfer(address,address,uint256)")'),
    fromBlock: z.number().optional().describe('Starting block number (optional)'),
    toBlock: z.number().optional().describe('Ending block number (optional)'),
  }),
  execute: async ({ chainId, contractAddress, eventSignature, fromBlock, toBlock }) => {
    try {
      const events = await HypersyncHelper.getContractEvents(
        chainId,
        contractAddress,
        eventSignature,
        fromBlock,
        toBlock
      );
      const serializedEvents = serializeBigInts(events);
      return {
        success: true,
        data: JSON.stringify(serializedEvents),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getBlockRangeTool = tool({
  description: 'Get all blocks and transactions within a specific block range',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    fromBlock: z.number().describe('Starting block number'),
    toBlock: z.number().describe('Ending block number'),
  }),
  execute: async ({ chainId, fromBlock, toBlock }) => {
    try {
      const blocks = await HypersyncHelper.getBlockRange(chainId, fromBlock, toBlock);
      const serializedBlocks = serializeBigInts(blocks);
      return {
        success: true,
        data: JSON.stringify(serializedBlocks),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getLatestBlockTool = tool({
  description: 'Get the latest block number from the blockchain',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
  }),
  execute: async ({ chainId }) => {
    try {
      const blockNumber = await HypersyncHelper.getLatestBlockNumber(chainId);
      return {
        success: true,
        data: blockNumber.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getSupportedChainsTool = tool({
  description: 'Get list of supported chains and their configurations',
  parameters: z.object({}),
  execute: async () => {
    try {
      const chains = HypersyncHelper.getSupportedChains();
      return {
        success: true,
        data: JSON.stringify(chains),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getTokenMetadataTool = tool({
  description: 'Get metadata for an ERC20 token including name, symbol, and decimals',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    tokenAddress: z.string().describe('The token contract address'),
  }),
  execute: async ({ chainId, tokenAddress }) => {
    try {
      const metadata = await HypersyncHelper.getTokenMetadata(chainId, tokenAddress);
      return {
        success: true,
        data: JSON.stringify(metadata),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getDexSwapsTool = tool({
  description: 'Get DEX swap events for specific tokens or pairs',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    dexAddress: z.string().describe('The DEX contract address'),
    fromBlock: z.number().optional().describe('Starting block number (optional)'),
    toBlock: z.number().optional().describe('Ending block number (optional)'),
    tokenAddress: z.string().optional().describe('Filter by specific token address (optional)'),
  }),
  execute: async ({ chainId, dexAddress, fromBlock, toBlock, tokenAddress }) => {
    try {
      const swaps = await HypersyncHelper.getDexSwaps(chainId, dexAddress, fromBlock, toBlock, tokenAddress);
      const serializedSwaps = serializeBigInts(swaps);
      return {
        success: true,
        data: JSON.stringify(serializedSwaps),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getWalletActivityTool = tool({
  description: 'Get comprehensive wallet activity including transactions, token transfers, and interactions',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    walletAddress: z.string().describe('The wallet address to analyze'),
    fromBlock: z.number().optional().describe('Starting block number (optional)'),
    toBlock: z.number().optional().describe('Ending block number (optional)'),
  }),
  execute: async ({ chainId, walletAddress, fromBlock, toBlock }) => {
    try {
      const activity = await HypersyncHelper.getWalletActivity(chainId, walletAddress, fromBlock, toBlock);
      const serializedActivity = serializeBigInts(activity);
      return {
        success: true,
        data: JSON.stringify(serializedActivity),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const getLiquidityPoolStatsTool = tool({
  description: 'Get statistics and events for a liquidity pool',
  parameters: z.object({
    chainId: z.number().describe('The chain ID of the network'),
    poolAddress: z.string().describe('The liquidity pool contract address'),
    fromBlock: z.number().optional().describe('Starting block number (optional)'),
    toBlock: z.number().optional().describe('Ending block number (optional)'),
  }),
  execute: async ({ chainId, poolAddress, fromBlock, toBlock }) => {
    try {
      const stats = await HypersyncHelper.getLiquidityPoolStats(chainId, poolAddress, fromBlock, toBlock);
      const serializedStats = serializeBigInts(stats);
      return {
        success: true,
        data: JSON.stringify(serializedStats),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});