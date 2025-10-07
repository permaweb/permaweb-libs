//import { checkValidAddress } from './utils.ts';

// TO DO : Needs to consider the ar://protocol and restructure `getRendererEndpoint` 

export function getARBalanceEndpoint(walletAddress: string) {
	return `/wallet/${walletAddress}/balance`;
}

export function getTxEndpoint(txId: string) {
	return txId;
}

// export function getRendererEndpoint(renderWith: string, tx: string) {
// 	if (checkValidAddress(renderWith)) {
// 		return `ar://${renderWith}/?tx=${tx}`;
// 	} else {
// 		return `https://${renderWith}.arweave.net/?tx=${tx}`;
// 	}
// }
