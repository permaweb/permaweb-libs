import { ArconnectSigner, createData } from '@dha-team/arbundles/web';

import { TAGS, UPLOAD } from '../helpers/config.ts';
import { DependencyType, TagType } from '../helpers/types.ts';
import { checkValidAddress, getBase64Data, getByteSize, getDataURLContentType } from '../helpers/utils.ts';

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

				const response = await (global.window as any).arweaveWallet.dispatch(tx);
				return response.id;
			} catch (e: any) {
				throw new Error(e.message ?? 'Error dispatching transaction');
			}
		} else {
			try {
				const uploadResponse = await runUpload(
					args.data as any,
					{
						tags: [
							{ name: 'Content-Type', value: contentType },
							{ name: 'App-Name', value: '@permaweb/libs' },
						],
					},
					{
						apiUrl: UPLOAD.node1,
						token: 'arweave',
						chunkSize: 5 * 1024 * 1024,
						batchSize: 3,
					},
				);

				console.log(uploadResponse);

				console.log('Uploaded dataItem ID:', uploadResponse.id);

				return uploadResponse.id;
			} catch (e: any) {
				throw new Error(e.message ?? 'Error uploading transaction');
			}
		}
	} else {
		throw new Error('Error preparing transaction data');
	}
}

export async function runUpload(
	fileBlob: Blob,
	txOpts: any & { upload?: any },
	uploadOpts: {
		apiUrl: string;
		token: string;
		chunkSize: number;
		batchSize?: number;
	},
): Promise<any> {
	const { apiUrl, token, chunkSize, batchSize = 3 } = uploadOpts;

	let signer = new ArconnectSigner(window.arweaveWallet);
	const pubKey = await (signer as any).signer.getActivePublicKey();
	signer.publicKey = Buffer.from(pubKey, 'base64');

	const rawFile = new Uint8Array(await fileBlob.arrayBuffer());
	const dataItem = createData(rawFile, signer, {
		...txOpts,
		anchor:
			txOpts.anchor ||
			(() => {
				const a = new Uint8Array(32);
				crypto.getRandomValues(a);
				return btoa(String.fromCharCode(...a))
					.replace(/\+/g, '-')
					.replace(/\//g, '_')
					.slice(0, 32);
			})(),
	});

	await dataItem.sign(signer);

	const rawBytes = dataItem.getRaw();

	const fullBlob = new Blob([new Uint8Array(rawBytes)], {
		type: 'application/octet-stream',
	});

	const commonHeaders = { 'x-chunking-version': '2' };
	let infoRes = await fetch(`${apiUrl}/chunks/${token}/-1/-1`, { headers: commonHeaders });
	if (!infoRes.ok) {
		throw new Error(`Failed to get upload ID: ${infoRes.status} ${await infoRes.text()}`);
	}
	const info = (await infoRes.json()) as {
		id: string;
		min: number;
		max: number;
		chunks?: [string, number][];
	};
	const uploadId = info.id;
	if (chunkSize < info.min || chunkSize > info.max) {
		throw new Error(`Configured chunkSize ${chunkSize} is out of allowed range ${info.min}-${info.max}`);
	}

	const totalSize = fullBlob.size;
	const offsets: number[] = [];
	for (let off = 0; off < totalSize; off += chunkSize) {
		offsets.push(off);
	}
	const present = new Set<number>();
	(info.chunks ?? []).forEach(([off]) => present.add(Number(off)));

	const dataOffsets = offsets.filter((o) => o > 0 && !present.has(o));
	const headerOffset = !present.has(0) ? [0] : [];
	const toUpload = dataOffsets.concat(headerOffset);

	const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

	for (let i = 0; i < toUpload.length; i += batchSize) {
		const batch = toUpload.slice(i, i + batchSize);
		await Promise.all(
			batch.map(async (off) => {
				const slice = fullBlob.slice(off, off + chunkSize);
				const body = await slice.arrayBuffer();

				let lastError: any = null;
				for (let attempt = 1; attempt <= 3; attempt++) {
					try {
						const up = await fetch(`${apiUrl}/chunks/${token}/${uploadId}/${off}`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/octet-stream', ...commonHeaders },
							body,
						});
						if (!up.ok) {
							const text = await up.text();
							if (up.status === 402) {
								throw new Error(`402 payment required: ${text}`);
							}
							throw new Error(`Chunk upload error ${up.status}: ${text}`);
						}
						return;
					} catch (err: any) {
						lastError = err;
						if (attempt < 3) {
							await sleep(1000 * attempt);
							continue;
						}
					}
				}
				throw lastError;
			}),
		);
	}

	const finalHeaders: Record<string, string> = {
		'Content-Type': 'application/octet-stream',
		...commonHeaders,
	};

	const finishRes = await fetch(`${apiUrl}/chunks/${token}/${uploadId}/-1`, {
		method: 'POST',
		headers: finalHeaders,
	});
	if (!finishRes.ok) {
		const txt = await finishRes.text();
		throw new Error(`Finalizing upload failed ${finishRes.status}: ${txt}`);
	}

	return finishRes.json();
}
