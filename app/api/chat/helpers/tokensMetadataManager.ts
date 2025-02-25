import {ethers} from 'ethers'
import { ERC20_ABI } from '../ABI/erc20';
import { ERC721_ABI } from '../ABI/erc721';
import { ERC1155_ABI } from '../ABI/erc1155';

const sanitizeABI = (abi: any) => JSON.parse(JSON.stringify(abi));

export class TokenMetadataManager {
    private static instance: TokenMetadataManager;  
    private constructor() {}
  
    static getInstance(): TokenMetadataManager {
      if (!TokenMetadataManager.instance) {
        TokenMetadataManager.instance = new TokenMetadataManager();
      }
      return TokenMetadataManager.instance;
    }
  
    async getTokenMetadata(provider: ethers.JsonRpcProvider, tokenAddress: string, tokenType: string = 'ERC20') {      
      try {
        let contract;
        let metadata: any = { 
          address: tokenAddress,
          type: tokenType,
          timestamp: Date.now()
        };
  
        switch (tokenType) {
          case 'ERC20':
            contract = new ethers.Contract(tokenAddress, sanitizeABI(ERC20_ABI), provider);
            try {
              const [name, symbol, decimals] = await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals()
              ]);
              metadata = {
                ...metadata,
                name,
                symbol,
                decimals
              };
            } catch (e) {
              console.log('Error fetching ERC20 metadata:', e);
              metadata.error = 'Incomplete metadata';
            }
            break;
  
          case 'ERC721':
            console.log("Getting ERC721 metadata", ERC721_ABI)
            contract = new ethers.Contract(tokenAddress, sanitizeABI(ERC721_ABI), provider);
            try {
              const [name, symbol] = await Promise.all([
                contract.name(),
                contract.symbol()
              ]);
              metadata = {
                ...metadata,
                name,
                symbol
              };
            } catch (e) {
              console.log('Error fetching ERC721 metadata:', e);
              metadata.error = 'Incomplete metadata';
            }
            break;
  
          case 'ERC1155':
            contract = new ethers.Contract(tokenAddress, sanitizeABI(ERC1155_ABI), provider);
            metadata = {
              ...metadata,
              type: 'ERC1155'
            };
            break;
        }
  
        return metadata;
      } catch (error) {
        console.error('Error getting token metadata:', error);
        return { 
          address: tokenAddress, 
          type: tokenType,
          error: 'Failed to fetch metadata'
        };
      }
    }
  }


