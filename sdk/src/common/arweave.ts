import { createData, SIG_CONFIG, SignatureConfig } from '@dha-team/arbundles/web';

import { TAGS, UPLOAD } from '../helpers/config.ts';
import type { PlatformDependencyType } from '../helpers/platform.ts';
import { createPlatformContext } from '../helpers/platform-providers.ts';
import { DependencyType, TagType } from '../helpers/types.ts';
import { checkValidAddress, getBase64Data, getByteSize, getDataURLContentType } from '../helpers/utils.ts';

function createDataItemAnchor(platform: any) {
	const anchorBytes = platform.crypto.randomBytes(32);
	return platform.base64.encode(anchorBytes).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 32);
}

async function createSignedDataItemBytes(rawFile: Uint8Array, platform: any, txOpts: any & { upload?: any }) {
	const dataItemOpts = txOpts ?? {};
	const opts = {
		...dataItemOpts,
		anchor: dataItemOpts.anchor || createDataItemAnchor(platform),
	};

	if (typeof platform.wallet.signDataItem === 'function') {
		return platform.wallet.signDataItem({
			data: rawFile,
			tags: opts.tags,
			target: opts.target,
			anchor: opts.anchor,
		});
	}

	const pubKey = await platform.wallet.getActivePublicKey();
	const signatureConfig = SIG_CONFIG[SignatureConfig.ARWEAVE];
	const signer = {
		publicKey: platform.base64.decode(pubKey),
		signatureType: SignatureConfig.ARWEAVE,
		signatureLength: signatureConfig.sigLength,
		ownerLength: signatureConfig.pubLength,
		sign: async (data: Uint8Array) => platform.wallet!.sign(data),
	};

	const dataItem = createData(rawFile, signer as any, opts);
	await dataItem.sign(signer as any);

	return new Uint8Array(dataItem.getRaw());
}

export function resolveTransactionWith(deps: DependencyType) {
	return async (data: any, args?: { tags: TagType[] }) => {
		if (checkValidAddress(data)) return data;
		if (!deps.arweave) throw new Error(`Must initialize with Arweave in order to create transactions`);
		console.log(args)
		try {
			return await createTransaction(deps, { ...(args ?? {}), data });
		} catch (e: any) {
			throw new Error(e.message ?? 'Error resolving transaction');
		}
	};
}

export async function createTransaction(
	deps: DependencyType,
	args: {
		data: any; // File | string | FileInput
		tags?: TagType[];
	},
): Promise<string> {
	// Initialize platform context
	const platformDeps = deps as PlatformDependencyType;
	const platform = platformDeps.platform || createPlatformContext();

	let content: any = null;
	let contentType: string | null = null;
	let contentSize: number | null = null;

	if (typeof args.data === 'string') {
		const base64Data = getBase64Data(args.data);
		const decoded = platform.base64.decode(base64Data);
		content = decoded;
		contentType = getDataURLContentType(args.data);
		contentSize = getByteSize(content);
	} else if (platform.file.isFile(args.data)) {
		// Handle platform-specific file
		const buffer = await platform.file.readAsArrayBuffer(args.data);
		content = new Uint8Array(buffer);
		contentType = platform.file.getContentType(args.data);
		contentSize = platform.file.getSize(args.data);
	} else {
		// Try to handle as generic data
		const buffer = await platform.file.readAsArrayBuffer(args.data);
		content = new Uint8Array(buffer);
		contentType = platform.file.getContentType(args.data);
		contentSize = platform.file.getSize(args.data);
	}

	if (content && contentType && contentSize) {
		if (contentSize < Number(UPLOAD.dispatchUploadSize)) {
			try {
				if (!platform.wallet) {
					throw new Error('Wallet provider not available');
				}

				const tx = await deps.arweave.createTransaction({ data: content });
				tx.addTag(TAGS.keys.contentType, contentType);
				if (args.tags && args.tags.length > 0) args.tags.forEach((tag: TagType) => tx.addTag(tag.name, tag.value));

				const response = await platform.wallet.dispatch(tx);
				return response.id;
			} catch (e: any) {
				throw new Error(e.message ?? 'Error dispatching transaction');
			}
		} else {
			try {
				// Create blob for upload
				const blob = platform.blob.createBlob(content, contentType);

				const tags = [
					{ name: 'Content-Type', value: contentType },
				]
				if (args.tags && args.tags.length > 0) args.tags.forEach((tag: TagType) => tags.push({ name: tag.name, value: tag.value }));

				const uploadResponse = await runUpload(
					blob,
					platform,
					{
						tags: tags
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
	fileBlob: any, // Blob or Uint8Array (React Native)
	platform: any, // PlatformContext
	txOpts: any & { upload?: any },
	uploadOpts: {
		apiUrl: string;
		token: string;
		chunkSize?: number;
		batchSize?: number;
		useChunks?: boolean;
	},
): Promise<any> {
	const { apiUrl, token, batchSize = 3, useChunks = false } = uploadOpts;

	if (!platform.wallet) {
		throw new Error('Wallet provider not available');
	}

	// Read file blob as Uint8Array
	const rawFile = new Uint8Array(await platform.blob.readAsArrayBuffer(fileBlob));
	const rawBytes = await createSignedDataItemBytes(rawFile, platform, txOpts);

	if (!useChunks) {
		const uploadRes = await fetch(`${apiUrl}/tx/${token}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/octet-stream',
				Accept: 'application/json',
			},
			body: rawBytes,
		});

		if (!uploadRes?.ok) {
			const text = await uploadRes.text();
			throw new Error(`${uploadRes.status}: ${text}`);
		}

		return uploadRes.json();
	}

	const { chunkSize } = uploadOpts;
	if (!chunkSize) {
		throw new Error('chunkSize is required when useChunks is true');
	}

	const fullBlob = platform.blob.createBlob(new Uint8Array(rawBytes), 'application/octet-stream');

	const commonHeaders = { 'x-chunking-version': '2' }; // 'x-paid-by': paidByArray.join(',')
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

	const totalSize = platform.blob.getSize(fullBlob);
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
				const slice = platform.blob.slice(fullBlob, off, off + chunkSize);
				const body = await platform.blob.readAsArrayBuffer(slice);

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
