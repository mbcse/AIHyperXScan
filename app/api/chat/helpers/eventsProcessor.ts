import {ethers} from 'ethers'
import { TokenMetadataManager } from './tokensMetadataManager';
import { TRANSFERS } from '../types';
import { ERC721_EVENTS_ABI, EVENTS_ABI } from '../ABI/events';
import { ERC721_ABI } from '../ABI/erc721';


type EVENT = {
    data: string, topics: Array<string>
}

type DECODED_EVENT_DATA = {
    eventName: string | null;
    [key: string]: string | null;
};

const formatEtherjsLog = async (parsedLog: ethers.LogDescription | null ) : Promise<Record<string, string | null> | null> => {
    if (!parsedLog || !parsedLog.fragment?.inputs || !parsedLog.args) {
        return null;
    }

    const formattedEvent : Record<string, string | null> = {}
    for (let i = 0; i < parsedLog.args.length; i++) {
    const input = parsedLog.fragment.inputs[i]
    let arg = parsedLog.args[i]
    if (typeof arg === 'object' && arg._isBigNumber) {
        arg = arg.toString()
    }
    formattedEvent[input.name] = arg
    }
    return formattedEvent
}


  
export const decodeEventData = async (
    abi: ethers.InterfaceAbi,
    event: EVENT
): Promise<DECODED_EVENT_DATA> => {
    try {
        // Initialize the ethers interface
        const iface = new ethers.Interface(abi);
        // Parse the event log
        const parsedLog: ethers.LogDescription | null = iface.parseLog(event);

        // Decode and Format the event using formatEtherjsLog
        const formattedEventData = await formatEtherjsLog(parsedLog);

        // Return the decoded event data with the event name
        return { eventName: parsedLog?.name ?? null, ...(formattedEventData || {}) };
    } catch (error) {
        // Handle errors gracefully (e.g., invalid ABI or event data)
        console.error("Error decoding event data:", error.message);
        if(error.message.includes("data out-of-bounds")){
            return decodeEventData(ERC721_EVENTS_ABI, event)
        }
        return { eventName: null };
    }
};




export const classifyAndExtractEvents = async (receipt: ethers.TransactionReceipt, provider: ethers.JsonRpcProvider) => {
    console.time('EventProcessor');  // Start the timer with a label

    let contractInteractions: any[] = []
    let actions: any[] = []
    let otherEvents: any[] = []
    let types: any[] = []
    let transfers: TRANSFERS[] = [] as TRANSFERS[]

    // Process transaction logs 
    for (const log of receipt?.logs || []) {
      // Track unique contracts interacted with
      if (!contractInteractions.includes(log.address)) {
        contractInteractions.push(log.address);
      }
      const metadataManager = TokenMetadataManager.getInstance();
      const event = await decodeEventData(EVENTS_ABI, { data: log.data, topics: log.topics as string[] });
      console.log("LogData ->> ", event)
      if (event.eventName === "Transfer") {
        // Distinguish between ERC20 and ERC721 based on the type of arguments
        if ( log.topics.length === 3 && event.value) {
            const tokenMetadata = await metadataManager.getTokenMetadata(provider, log.address, 'ERC20');
            // If "value" exists, it's ERC20
            transfers.push({
                tokenType: 'ERC20',
                token: tokenMetadata,
                from: '0x' + log.topics[1].slice(26),
                to: '0x' + log.topics[2].slice(26),
                value: ethers.formatUnits(event.value, tokenMetadata.decimals || 18)
              });

            types.push('Token Transfer');
        } else if (log.topics.length === 4 && event.tokenId) {
                const tokenMetadata = await metadataManager.getTokenMetadata(provider, log.address, 'ERC721');

                // If "tokenId" exists, it's ERC721
                transfers.push({
                tokenType: "ERC721" as string,
                token: tokenMetadata,
                from: event.from as string,
                to: event.to as string,
                tokenId: event.tokenId.toString(),
                });
                types.push('NFT Transfer');
            }
        }
        else if (event.eventName === "TransferSingle") {
            const tokenMetadata = await metadataManager.getTokenMetadata(provider, log.address, 'ERC1155');
            // Handle ERC1155 TransferSingle event
            transfers.push({
                tokenType: "ERC1155",
                operator: event.operator as string,
                from: event.from as string,
                to: event.to as string,
                tokenId: event?.id?.toString(),
                value: event?.value?.toString(),
                token: tokenMetadata,
            });
            types.push('NFT Transfer');
        }
        else if (event.eventName === "TransferBatch") {
            const tokenMetadata = await metadataManager.getTokenMetadata(provider, log.address, 'ERC1155');
            // Handle ERC1155 TransferBatch event
            transfers.push({
                tokenType: "ERC1155",
                operator: event.operator as string,
                from: event.from as string,
                to: event.to as string,
                tokenIds: event.ids?.map((id: any) => id.toString()),
                amounts: event.values?.map((value: any) => value.toString()),
                token: tokenMetadata,
            });
            types.push('NFT Transfer');
        }
      else {
        if(event.eventName){
            types.push(event.eventName)
            actions.push(event)
        }else{
            otherEvents.push({
                address: log.address,
                topics: log.topics,
                data: log.data
              });
        }
      }
    }
    console.timeEnd('EventProcessor');  // End the timer with the same label
    return { contractInteractions, actions, otherEvents, types, transfers };
}



