import { ArconnectSigner, createData } from '@dha-team/arbundles/web';

import { TAGS, UPLOAD } from '../helpers/config.ts';
import type { PlatformDependencyType } from '../helpers/platform.ts';
import { createPlatformContext } from '../helpers/platform-providers.ts';
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

				const tx = await deps.arweave.createTransaction({ data: content }, 'use_wallet');
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

				const uploadResponse = await runUpload(
					blob,
					platform,
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
	fileBlob: any, // Blob or Uint8Array (React Native)
	platform: any, // PlatformContext
	txOpts: any & { upload?: any },
	uploadOpts: {
		apiUrl: string;
		token: string;
		chunkSize: number;
		batchSize?: number;
	},
): Promise<any> {
	const { apiUrl, token, chunkSize, batchSize = 3 } = uploadOpts;

	if (!platform.wallet) {
		throw new Error('Wallet provider not available');
	}

	const nonce = platform.crypto.randomUUID();
	const msg = new TextEncoder().encode(nonce);

	// Get public key from wallet
	const pubKey = await platform.wallet.getActivePublicKey();

	// Sign the message
	const sigBytes = await platform.wallet.sign(msg);
	const toB64Url = (buf: Uint8Array) =>
		platform.base64.encode(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	const signature = toB64Url(sigBytes);
	const turboBalanceRes = await fetch('https://payment.ardrive.io/v1/balance', {
		headers: {
			'x-nonce': nonce,
			'x-signature': signature,
			'x-public-key': pubKey,
		},
	});

	const turboBalance = await turboBalanceRes.json();

	// 2. Extract all paying addresses
	const paidByArray = (turboBalance.receivedApprovals || []).map((a: any) => a.payingAddress);

	// Read file blob as Uint8Array
	const rawFile = new Uint8Array(await platform.blob.readAsArrayBuffer(fileBlob));

	// Create a compatible signer for arbundles
	// Note: This may need adjustment based on arbundles compatibility
	const compatibleSigner = {
		publicKey: platform.base64.decode(pubKey),
		sign: async (data: Uint8Array) => platform.wallet!.sign(data),
		getActivePublicKey: async () => pubKey,
	};

	const dataItem = createData(rawFile, compatibleSigner as any, {
		...txOpts,
		anchor:
			txOpts.anchor ||
			(() => {
				const a = platform.crypto.randomBytes(32);
				return platform.base64.encode(a).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 32);
			})(),
	});

	await dataItem.sign(compatibleSigner as any);

	const rawBytes = dataItem.getRaw();

	const fullBlob = platform.blob.createBlob(new Uint8Array(rawBytes), 'application/octet-stream');

	const commonHeaders = { 'x-chunking-version': '2', 'x-paid-by': paidByArray.join(',') };
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
