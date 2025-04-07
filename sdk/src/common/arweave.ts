
import { ReadableStream } from 'web-streams-polyfill';
/* Used for build - Do not remove ! */
import Arweave from 'arweave';
import { ArconnectSigner, TurboFactory } from '@ardrive/turbo-sdk/web';

import { TAGS, UPLOAD } from '../helpers/config.ts';
import { DependencyType, TagType } from '../helpers/types.ts';
import { checkValidAddress, getBase64Data, getByteSize, getDataURLContentType, globalLog } from '../helpers/utils.ts';

TurboFactory.setLogLevel('debug')

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
		data: File | string;
		tags?: TagType[];
	},
): Promise<string> {
	let content: any = null;
	let contentType: string | null = null;
	let contentSize: number | null = null;

	if (typeof args.data === 'string') {
		content = Buffer.from(getBase64Data(args.data), 'base64');
		contentType = getDataURLContentType(args.data);
		contentSize = getByteSize(content);
	}

	if (args.data instanceof File) {
		content = new Uint8Array(await args.data.arrayBuffer());
		contentType = args.data.type;
		contentSize = args.data.size;
	}

	if (content && contentType && contentSize) {
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
					fileStreamFactory: () =>
						new ReadableStream({
							start(controller) {
								controller.enqueue(content);
								controller.close();
							},
						}),
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
