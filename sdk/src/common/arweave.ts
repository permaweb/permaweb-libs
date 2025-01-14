import Arweave from 'arweave';

import { TAGS, UPLOAD } from 'helpers/config';
import { DependencyType, TagType } from 'helpers/types';
import { checkValidAddress, getBase64Data, getByteSize, getDataURLContentType, globalLog } from 'helpers/utils';

export async function createTransaction(deps: DependencyType, args: {
	data: any;
	tags?: TagType[];
	uploadMethod?: 'default' | 'turbo';
}): Promise<string> {
	let content: any = null;
	let contentType: string | null = null;

	try {
		if (typeof args.data === 'string' && args.data.startsWith('data:')) {
			content = Buffer.from(getBase64Data(args.data), 'base64');
			contentType = getDataURLContentType(args.data);
		}
	}
	catch (e: any) {
		throw new Error(e);
	}
  
	if (content && contentType) {
		const contentSize: number = getByteSize(content);

		globalLog(`Content upload size: ${contentSize}`);

		if (contentSize < Number(UPLOAD.dispatchUploadSize)) {
			const tx = await deps.arweave.createTransaction({ data: content }, 'use_wallet');
			tx.addTag(TAGS.keys.contentType, contentType)
			if (args.tags && args.tags.length > 0) args.tags.forEach((tag: TagType) => tx.addTag(tag.name, tag.value));

			const response = await global.window.arweaveWallet.dispatch(tx);
			return response.id;
		}
		else {
			throw new Error('Data exceeds max upload limit'); // TODO
		}
	}
	else {
		throw new Error('Error preparing transaction data');
	}
}

export async function resolveTransaction(deps: DependencyType, data: any): Promise<string> {
	if (checkValidAddress(data)) return data;
  if(!deps.arweave) throw new Error(`Must initialize with Arweave in order to create transactions`);
	try {
    return await createTransaction(deps, { data: data });
  } catch (e: any) {
    throw new Error(e.message ?? 'Error resolving transaction');
  }
}