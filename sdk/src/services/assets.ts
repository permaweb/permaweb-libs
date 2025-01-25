import { aoCreateProcess, aoDryRun } from 'common/ao';
import { getGQLData } from 'common/gql';

import { AO, CONTENT_TYPES, GATEWAYS, LICENSES, TAGS } from 'helpers/config';
import {
	AssetCreateArgsType,
	AssetDetailType,
	AssetHeaderType,
	DependencyType,
	GQLNodeResponseType,
	TagType,
	UDLicenseType,
} from 'helpers/types';
import { formatAddress, getBootTag, getTagValue, mapFromProcessCase, mapToProcessCase } from 'helpers/utils';

export function createAtomicAssetWith(deps: DependencyType) {
	return async (args: AssetCreateArgsType, callback?: (status: any) => void) => {
		const validationError = getValidationErrorMessage(args);
		if (validationError) throw new Error(validationError);

		const data = CONTENT_TYPES[args.contentType]?.serialize(args.data) ?? args.data;
		const tags = buildAssetCreateTags(args);

		try {
			const assetId = await aoCreateProcess(
				deps,
				{ spawnTags: tags, spawnData: data },
				callback ? (status) => callback(status) : undefined,
			);

			return assetId;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error creating asset');
		}
	};
}

export async function getAtomicAsset(deps: DependencyType, id: string, args?: { useGateway?: boolean }): Promise<AssetDetailType | null> {
	try {
		const processInfo = await aoDryRun(deps, {
			processId: id,
			action: 'Info',
		});

		if (args?.useGateway) {
			const gqlResponse = await getGQLData({
				gateway: GATEWAYS.goldsky,
				ids: [id],
				tags: null,
				owners: null,
				cursor: null,
			});

			return {
				tags: gqlResponse?.data?.[0]?.node?.tags,
				...mapFromProcessCase(processInfo)
			}
		}

		return mapFromProcessCase(processInfo);

	} catch (e: any) {
		throw new Error(e.message || 'Error fetching atomic asset');
	}
}

export function getAtomicAssetWith(deps: DependencyType) {
	return async (id: string): Promise<AssetDetailType | null> => {
		return await getAtomicAsset(deps, id);
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

export function buildAsset(element: GQLNodeResponseType): AssetHeaderType {
	const mappedTagKeys = new Set([
		TAGS.keys.creator,
		TAGS.keys.title,
		TAGS.keys.name,
		TAGS.keys.description,
		TAGS.keys.type,
		TAGS.keys.topic,
		TAGS.keys.implements,
		TAGS.keys.contentType,
		TAGS.keys.renderWith,
		TAGS.keys.thumbnail,
		TAGS.keys.license,
		TAGS.keys.access,
		TAGS.keys.derivations,
		TAGS.keys.commericalUse,
		TAGS.keys.dataModelTraining,
		TAGS.keys.paymentMode,
		TAGS.keys.paymentAddress,
		TAGS.keys.currency,
		TAGS.keys.collectionId,
		TAGS.keys.dateCreated,
	]);

	const asset = {
		id: element.node.id,
		owner: element.node.owner.address,
		creator: getTagValue(element.node.tags, TAGS.keys.creator),
		name: getName(element),
		description: getTagValue(element.node.tags, TAGS.keys.description),
		type: getTagValue(element.node.tags, TAGS.keys.type),
		topics: getTopics(element),
		implementation: getTagValue(element.node.tags, TAGS.keys.implements),
		contentType: getTagValue(element.node.tags, TAGS.keys.contentType),
		renderWith: getTagValue(element.node.tags, TAGS.keys.renderWith),
		thumbnail: getTagValue(element.node.tags, TAGS.keys.thumbnail),
		udl: getLicense(element),
		collectionId: getTagValue(element.node.tags, TAGS.keys.collectionId),
		dateCreated: getDateCreated(element),
		blockHeight: element.node.block ? element.node.block.height : 0,
		tags: element.node.tags.filter((tag) => !mappedTagKeys.has(tag.name)),
	};

	return asset;
}

function getName(element: GQLNodeResponseType): string {
	return (
		getTagValue(element.node.tags, TAGS.keys.name) ||
		getTagValue(element.node.tags, TAGS.keys.title) ||
		formatAddress(element.node.id, false)
	);
}

function getTopics(element: GQLNodeResponseType): string[] {
	return element.node.tags.filter((tag) => tag.name.includes(TAGS.keys.topic.toLowerCase())).map((tag) => tag.value);
}

function getDateCreated(element: GQLNodeResponseType): number {
	if (element.node.block) {
		return element.node.block.timestamp * 1000;
	}

	const dateCreatedTag = getTagValue(element.node.tags, TAGS.keys.dateCreated);
	if (dateCreatedTag) {
		return Number(dateCreatedTag);
	}

	return 0;
}

function getLicense(element: GQLNodeResponseType): UDLicenseType | null {
	const license = getTagValue(element.node.tags, TAGS.keys.license);

	if (license && license === LICENSES.udl.address) {
		return {
			access: { value: getTagValue(element.node.tags, TAGS.keys.access) },
			derivations: { value: getTagValue(element.node.tags, TAGS.keys.derivations) },
			commercialUse: { value: getTagValue(element.node.tags, TAGS.keys.commericalUse) },
			dataModelTraining: { value: getTagValue(element.node.tags, TAGS.keys.dataModelTraining) },
			paymentMode: getTagValue(element.node.tags, TAGS.keys.paymentMode),
			paymentAddress: getTagValue(element.node.tags, TAGS.keys.paymentAddress),
			currency: getTagValue(element.node.tags, TAGS.keys.currency),
		};
	}
	return null;
}

function buildAssetCreateTags(args: AssetCreateArgsType): { name: string; value: string }[] {
	const tags = [
		{ name: TAGS.keys.bootloaderInit, value: args.src ?? AO.src.asset },
		{ name: TAGS.keys.creator, value: args.creator },
		{ name: TAGS.keys.assetType, value: args.assetType },
		{ name: TAGS.keys.contentType, value: args.contentType },
		{ name: TAGS.keys.implements, value: 'ANS-110' },
		{ name: TAGS.keys.dateCreated, value: new Date().getTime().toString() },
		getBootTag('Name', args.name),
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
