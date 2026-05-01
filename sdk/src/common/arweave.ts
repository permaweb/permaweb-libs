import { createData, SIG_CONFIG, SignatureConfig } from '@dha-team/arbundles/web';

import { TAGS, UPLOAD } from '../helpers/config.ts';
import type { PlatformDependencyType } from '../helpers/platform.ts';
import { createPlatformContext } from '../helpers/platform-providers.ts';
import { DependencyType, TagType } from '../helpers/types.ts';
import { checkValidAddress, getBase64Data, getByteSize, getDataURLContentType } from '../helpers/utils.ts';

export interface FolderUploadFile {
	path: string;
	data: any;
	contentType?: string;
	tags?: TagType[];
}

export interface FolderUploadArgs {
	files: FolderUploadFile[];
	tags?: TagType[];
	fileTags?: TagType[];
	concurrency?: number;
	indexPath?: string;
	throwOnFailure?: boolean;
}

export interface FolderUploadResult {
	transactionId: string;
	totalFiles: number;
	uploaded: number;
	failed: number;
	manifest: {
		manifest: 'arweave/paths';
		version: '0.2.0';
		index?: { path: string };
		paths: Record<string, { id: string }>;
	};
	failures: { path: string; message: string }[];
}

type FolderUploadTask = FolderUploadFile & {
	path: string;
	contentType: string;
};

type FolderFileUploadResult = {
	path: string;
	transactionId: string | null;
	error?: Error;
};

const DEFAULT_FOLDER_UPLOAD_CONCURRENCY = 3;
const ARWEAVE_MANIFEST_CONTENT_TYPE = 'application/x.arweave-manifest+json';

function createDataItemAnchor(platform: any) {
	const anchorBytes = platform.crypto.randomBytes(32);
	return platform.base64.encode(anchorBytes).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 32);
}

function normalizeFolderUploadPath(path: string): string {
	return path
		.replace(/\\/g, '/')
		.split('/')
		.filter((segment) => segment && segment !== '.' && segment !== '..')
		.join('/');
}

function getFolderUploadContentType(file: FolderUploadFile, platform: any): string {
	if (file.contentType) return file.contentType;

	try {
		const contentType = platform.file.getContentType(file.data);
		if (contentType) return contentType;
	} catch {}

	return 'application/octet-stream';
}

async function readFolderUploadBytes(data: any, platform: any): Promise<Uint8Array> {
	if (typeof data === 'string') {
		return new TextEncoder().encode(data);
	}

	if (data instanceof Uint8Array) {
		return data;
	}

	if (data instanceof ArrayBuffer) {
		return new Uint8Array(data);
	}

	if (ArrayBuffer.isView(data)) {
		return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
	}

	const buffer = await platform.file.readAsArrayBuffer(data);
	return new Uint8Array(buffer);
}

function bytesToDataUrl(bytes: Uint8Array, contentType: string, platform: any): string {
	const chunkSize = 0x8000;
	let binary = '';

	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as any);
	}

	return `data:${contentType};base64,${platform.base64.btoa(binary)}`;
}

async function folderUploadDataToTransactionData(file: FolderUploadFile, contentType: string, platform: any): Promise<any> {
	if (typeof file.data === 'string' && /^data:/i.test(file.data)) {
		return file.data;
	}

	return bytesToDataUrl(await readFolderUploadBytes(file.data, platform), contentType, platform);
}

async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	mapper: (item: T) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let nextIndex = 0;
	const workerCount = Math.max(1, Math.min(concurrency, items.length));

	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (nextIndex < items.length) {
				const currentIndex = nextIndex++;
				results[currentIndex] = await mapper(items[currentIndex]);
			}
		}),
	);

	return results;
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

export function uploadFolderWith(deps: DependencyType) {
	return async (args: FolderUploadArgs): Promise<FolderUploadResult> => {
		return uploadFolder(deps, args);
	};
}

export async function uploadFolder(deps: DependencyType, args: FolderUploadArgs): Promise<FolderUploadResult> {
	const platformDeps = deps as PlatformDependencyType;
	const platform = platformDeps.platform || createPlatformContext();
	const concurrency = args.concurrency ?? DEFAULT_FOLDER_UPLOAD_CONCURRENCY;
	const pathCounts = new Map<string, number>();

	const tasks: FolderUploadTask[] = args.files
		.map((file) => {
			const path = normalizeFolderUploadPath(file.path);
			if (!path) return null;

			const count = pathCounts.get(path) ?? 0;
			pathCounts.set(path, count + 1);

			return {
				...file,
				path: count > 0 ? `${path}-${count + 1}` : path,
				contentType: getFolderUploadContentType(file, platform),
			};
		})
		.filter((file): file is FolderUploadTask => !!file);

	if (tasks.length === 0) {
		throw new Error('Folder is empty, nothing to upload');
	}

	const uploadResults = await mapWithConcurrency(tasks, concurrency, async (task): Promise<FolderFileUploadResult> => {
		try {
			const data = await folderUploadDataToTransactionData(task, task.contentType, platform);
			const transactionId = await createTransaction(deps, {
				data,
				tags: [...(args.fileTags ?? []), ...(task.tags ?? [])],
			});

			return { path: task.path, transactionId };
		} catch (error: any) {
			if (args.throwOnFailure) {
				throw error;
			}

			return {
				path: task.path,
				transactionId: null,
				error: error instanceof Error ? error : new Error(error?.message ?? 'Failed to upload file'),
			};
		}
	});

	const failures = uploadResults
		.filter((result) => !result.transactionId)
		.map((result) => ({
			path: result.path,
			message: result.error?.message ?? 'Failed to upload file',
		}));
	const manifestPaths: Record<string, { id: string }> = {};

	for (const result of uploadResults) {
		if (!result.transactionId) continue;

		manifestPaths[result.path] = { id: result.transactionId };

		if (result.path.endsWith('/index.html')) {
			manifestPaths[result.path.replace(/\/index\.html$/, '')] = { id: result.transactionId };
		}
	}

	if (Object.keys(manifestPaths).length === 0) {
		throw new Error('No files were uploaded');
	}

	const indexPath =
		args.indexPath && manifestPaths[normalizeFolderUploadPath(args.indexPath)]
			? normalizeFolderUploadPath(args.indexPath)
			: manifestPaths['index.html']
				? 'index.html'
				: undefined;

	const manifest: FolderUploadResult['manifest'] = {
		manifest: 'arweave/paths',
		version: '0.2.0',
		...(indexPath ? { index: { path: indexPath } } : {}),
		paths: manifestPaths,
	};
	const manifestData = bytesToDataUrl(
		new TextEncoder().encode(JSON.stringify(manifest)),
		ARWEAVE_MANIFEST_CONTENT_TYPE,
		platform,
	);
	const transactionId = await createTransaction(deps, {
		data: manifestData,
		tags: args.tags,
	});

	return {
		transactionId,
		totalFiles: tasks.length,
		uploaded: uploadResults.length - failures.length,
		failed: failures.length,
		manifest,
		failures,
	};
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
