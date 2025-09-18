import { checkValidAddress } from './utils.ts';

export function getARBalanceEndpoint(walletAddress: string) {
	return `ar://wallet/${walletAddress}/balance`;
}

export function getTxEndpoint(txId: string) {
	return `ar://${txId}`;
}

export function getRendererEndpoint(renderWith: string, tx: string) {
	if (checkValidAddress(renderWith)) {
		return `ar://${renderWith}/?tx=${tx}`;
	} else {
		return `https://${renderWith}.arweave.net/?tx=${tx}`;
	}
}
