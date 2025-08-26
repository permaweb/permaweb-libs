import { aoCreateProcess, aoDryRun, readProcess } from '../common/ao.ts';
import { getGQLData } from '../common/gql.ts';
import { AO, CONTENT_TYPES, GATEWAYS, TAGS } from '../helpers/config.ts';
import {
	AssetCreateArgsType,
	AssetDetailType,
	AssetHeaderType,
	DependencyType,
	GQLNodeResponseType,
	TagType,
} from '../helpers/types.ts';
import { getBootTag, globalLog, mapFromProcessCase, mapToProcessCase } from '../helpers/utils.ts';

export function createAtomicAssetWith(deps: DependencyType) {
	return async (args: AssetCreateArgsType, callback?: (status: any) => void) => {
		const validationError = getValidationErrorMessage(args);
		if (validationError) throw new Error(validationError);

		let commentsId = null;
		if (args.spawnComments) {
			try {
				const commentTags = [
					{ name: TAGS.keys.onBoot, value: AO.src.comments },
					{ name: TAGS.keys.dateCreated, value: new Date().getTime().toString() },
				];

				if (args.users) commentTags.push({ name: 'Auth-Users', value: JSON.stringify(args.users) });

				commentsId = await aoCreateProcess(deps, {
					tags: commentTags
				}, callback ? (status: any) => callback(status) : undefined);

				globalLog(`Comments ID: ${commentsId}`);

				await new Promise((r) => setTimeout(r, 500));
			}
			catch (e: any) {
				console.error(e);
			}
		}

		const data = CONTENT_TYPES[args.contentType]?.serialize(args.data) ?? args.data;

		let assetArgs: any = { ...args };
		if (commentsId) assetArgs.commentsId = commentsId;
		const tags = buildAssetCreateTags(assetArgs);

		try {
			const assetId = await aoCreateProcess(
				deps,
				{ tags: tags, data: data },
				callback ? (status: any) => callback(status) : undefined,
			);

			return assetId;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error creating asset');
		}
	};
}

export async function getAtomicAsset(
	deps: DependencyType,
	id: string,
	args?: { useGateway?: boolean },
): Promise<AssetDetailType | null> {
	try {
		const processInfo = mapFromProcessCase(
			await readProcess(deps, {
				processId: id,
				path: 'asset',
				fallbackAction: 'Info',
			}),
		);

		if (args?.useGateway) {
			const gqlResponse = await getGQLData({
				gateway: GATEWAYS.ao,
				ids: [id],
				tags: null,
				owners: null,
				cursor: null,
			});

			const gatewayAsset = gqlResponse?.data?.[0] ? buildAsset(gqlResponse.data[0]) : {};

			return {
				...gatewayAsset,
				...processInfo,
			};
		}

		return {
			id: id,
			...processInfo,
		};
	} catch (e: any) {
		throw new Error(e.message || 'Error fetching atomic asset');
	}
}

export function getAtomicAssetWith(deps: DependencyType) {
	return async (id: string, args?: { useGateway?: boolean }): Promise<AssetDetailType | null> => {
		return await getAtomicAsset(deps, id, args);
	};
}

export async function getAtomicAssets(ids: string[]): Promise<AssetHeaderType[] | null> {
	try {
		const gqlResponse = await getGQLData({
			gateway: GATEWAYS.arweave,
			ids: ids ?? null,
			tags: null,
			owners: null,
			cursor: null,
		});

		if (gqlResponse && gqlResponse.data.length) {
			return gqlResponse.data.map((element: GQLNodeResponseType) => buildAsset(element));
		}

		return null;
	} catch (e: any) {
		throw new Error(e);
	}
}

export function buildAsset(element: GQLNodeResponseType): any {
	const asset: any = { id: element.node.id, owner: element.node.owner.address };

	for (const tag of element.node.tags) {
		const originalKey = tag.name;

		const keyWithoutPrefix = originalKey.startsWith(`${TAGS.keys.bootloader}-`)
			? originalKey.slice(`${TAGS.keys.bootloader}-`.length)
			: originalKey;

		const formattedKey = keyWithoutPrefix
			.split('-')
			.map((part, index) =>
				index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
			)
			.join('');

		let decodedValue;
		try {
			decodedValue = JSON.parse(tag.value);
		} catch {
			decodedValue = tag.value.toString();
		}

		asset[formattedKey] = decodedValue;
	}

	return asset;
}

function buildAssetCreateTags(args: AssetCreateArgsType): { name: string; value: string }[] {
	const tags = [
		{ name: TAGS.keys.onBoot, value: args.src ?? AO.src.asset },
		{ name: TAGS.keys.creator, value: args.creator },
		{ name: TAGS.keys.assetType, value: args.assetType },
		{ name: TAGS.keys.contentType, value: args.contentType },
		{ name: TAGS.keys.implements, value: 'ANS-110' },
		{ name: TAGS.keys.dateCreated, value: new Date().getTime().toString() },
		getBootTag('Name', args.name),
		getBootTag('Description', args.description),
		getBootTag('Topics', JSON.stringify(args.topics)),
		getBootTag('Ticker', 'ATOMIC'),
		getBootTag('Denomination', args.denomination?.toString() ?? '1'),
		getBootTag('TotalSupply', args.supply?.toString() ?? '1'),
		getBootTag('Transferable', args.transferable?.toString() ?? 'true'),
		getBootTag('Creator', args.creator),
	];

	if (args.metadata) {
		for (const entry in args.metadata) {
			tags.push(getBootTag(mapToProcessCase(entry), (args.metadata as any)[entry].toString()));
		}
	}

	if (args.users) tags.push({ name: 'Auth-Users', value: JSON.stringify(args.users) });
	if (args.commentsId) tags.push(getBootTag('Comments', args.commentsId));
	if (args.tags) args.tags.forEach((tag: TagType) => tags.push(tag));

	return tags;
}

function getValidationErrorMessage(args: AssetCreateArgsType): string | null {
	if (typeof args !== 'object' || args === null) return 'The provided arguments are invalid or empty.';

	const requiredFields = ['name', 'description', 'topics', 'creator', 'data', 'contentType', 'assetType'];
	for (const field of requiredFields) {
		if (!(field in args)) return `Missing field '${field}'`;
	}

	if (typeof args.name !== 'string' || args.name.trim() === '') return 'Name is required';
	if (typeof args.description !== 'string') return 'The description must be a valid string';
	if (!Array.isArray(args.topics) || args.topics.length === 0) return 'Topics are required';
	if (typeof args.creator !== 'string' || args.creator.trim() === '') return 'Creator is required';
	if (args.data === undefined || args.data === null) return 'Data field is required';
	if (typeof args.contentType !== 'string' || args.contentType.trim() === '')
		return 'Content type must be a non-empty string';
	if (typeof args.assetType !== 'string' || args.assetType.trim() === '') return 'Type must be a non-empty string';

	if ('supply' in args && (typeof args.supply !== 'number' || args.supply <= 0))
		return 'Supply must be a positive number';
	if ('denomination' in args && (typeof args.denomination !== 'number' || args.denomination <= 0))
		return 'Denomination must be a positive number';
	if ('transferable' in args && typeof args.transferable !== 'boolean') return 'Transferable must be a boolean value';
	if ('metadata' in args && typeof args.metadata !== 'object') return 'Metadata must be an object';
	if ('tags' in args && (!Array.isArray(args.tags) || args.tags.some((tag) => typeof tag !== 'object')))
		return 'Tags must be an array of objects';
	if ('src' in args && typeof args.src !== 'string') return 'Source must be a valid string';

	return null;
}
