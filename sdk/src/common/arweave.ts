/* Used for build - Do not remove ! */
import Arweave from 'arweave';
import { ArconnectSigner, TurboFactory } from '@ardrive/turbo-sdk/web';

import { TAGS, UPLOAD } from '../helpers/config.ts';
import { DependencyType, TagType } from '../helpers/types.ts';
import { checkValidAddress, getBase64Data, getByteSize, getDataURLContentType, globalLog } from '../helpers/utils.ts';

export function resolveTransactionWith(deps: DependencyType) {
	return async (data: any) => {
		if (checkValidAddress(data)) return data;
		if (!deps.arweave) throw new Error(`Must initialize with Arweave in order to create transactions`);
		try {
			return await createTransaction(deps, { data: data });
		} catch (e: any) {
			throw new Error(e.message ?? 'Error resolving transaction');
		}
	};
}

export async function resolveTransaction(deps: DependencyType, data: any) {
	if (checkValidAddress(data)) return data;
	if (!deps.arweave) throw new Error(`Must initialize with Arweave in order to create transactions`);
	try {
		return await createTransaction(deps, { data: data });
	} catch (e: any) {
		throw new Error(e.message ?? 'Error resolving transaction');
	}
}

export async function createTransaction(
	deps: DependencyType,
	args: {
		data: any;
		tags?: TagType[];
		uploadMethod?: 'default' | 'turbo';
	},
): Promise<string> {
	let content: any = null;
	let contentType: string | null = null;

	try {
		if (typeof args.data === 'string' && args.data.startsWith('data:')) {
			content = Buffer.from(getBase64Data(args.data), 'base64');
			contentType = getDataURLContentType(args.data);
		}
	} catch (e: any) {
		throw new Error(e);
	}

	if (content && contentType) {
		const contentSize: number = getByteSize(content);

		globalLog(`Content upload size: ${contentSize}`);

		if (contentSize < Number(UPLOAD.dispatchUploadSize)) {
			try {
				const tx = await deps.arweave.createTransaction({ data: content }, 'use_wallet');
				tx.addTag(TAGS.keys.contentType, contentType);
				if (args.tags && args.tags.length > 0) args.tags.forEach((tag: TagType) => tx.addTag(tag.name, tag.value));

				const response = await global.window.arweaveWallet.dispatch(tx);
				return response.id;
			}
			catch (e: any) {
				throw new Error(e.message ?? 'Error dispatching transaction');
			}
		} else {
			try {
				const signer = new ArconnectSigner(window.arweaveWallet);
				const turbo = TurboFactory.authenticated({ signer });
				
				const response = await turbo.uploadFile({
					fileStreamFactory: () => content,
					fileSizeFactory: () => contentSize,
					dataItemOpts: {
						tags: [{ name: TAGS.keys.contentType, value: contentType }]
					},
				});
				return response.id;
			}
			catch (e: any) {
				throw new Error(e.message ?? 'Error bundling transaction');
			}
		}
	} else {
		throw new Error('Error preparing transaction data');
	}
}
