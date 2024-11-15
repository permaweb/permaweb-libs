import { aoCreateProcess, aoDryRun, aoSend, fetchProcessSrc } from 'common/ao';
import { getGQLData } from 'common/gql';

import { AO, CONTENT_TYPES, GATEWAYS, LICENSES, TAGS } from 'helpers/config';
import { AssetCreateArgsType, AssetDetailType, AssetHeaderType, AssetStateType, GQLNodeResponseType, TagType, UDLicenseType } from 'helpers/types';
import { checkValidAddress, formatAddress, getTagValue } from 'helpers/utils';

// TODO: License
export async function createAtomicAsset(args: AssetCreateArgsType, wallet: any, callback?: (status: any) => void) {
	const validationError = getValidationErrorMessage(args);
	if (validationError) throw new Error(validationError);
	
	const data = CONTENT_TYPES[args.contentType]?.serialize(args.data) ?? args.data;
	const tags = buildAssetTags(args);
	
	let src: string | null = null;

	try {
		src = await fetchProcessSrc(args.src ?? AO.src.asset);

		if (src) {
			src = src.replaceAll(`'<NAME>'`, `[[${args.title}]]`);
			src = src.replaceAll('<CREATOR>', args.creator ?? await wallet.getActiveAddress()); // TODO: Support NodeJS / Browser
			src = src.replaceAll('<TICKER>', 'ATOMIC');
			src = src.replaceAll('<DENOMINATION>', args.denomination ? args.denomination.toString() : '1');
			src = src.replaceAll('<SUPPLY>', args.supply ? args.supply.toString() : '1');

			if (args.collectionId) src = src.replaceAll('<COLLECTION>', args.collectionId);
			if (!args.transferable) src = src.replace('Transferable = true', 'Transferable = false');
		}
	} catch (e: any) {
		throw new Error(e);
	}

	try {
		const assetId = await aoCreateProcess(
			{
				spawnData: data,
				spawnTags: tags,
				wallet: wallet,
				evalSrc: src,
			},
			callback ? (status) => callback(status) : undefined,
		);

		const initMessage = await aoSend({
			processId: assetId,
			wallet: wallet,
			action: 'Add-Upload-To-Zone'
		});

		console.log(`Init upload message: ${initMessage}`)

		return assetId;
	} catch (e: any) {
		throw new Error(e);
	}
}

export async function getAtomicAsset(id: string): Promise<AssetDetailType | null> {
	try {
		const gqlResponse = await getGQLData({
			gateway: GATEWAYS.goldsky,
			ids: [id],
			tags: null,
			owners: null,
			cursor: null,
		});

		if (gqlResponse && gqlResponse.data.length) {
			const asset: AssetHeaderType = buildAsset(gqlResponse.data[0]);

			let state: AssetStateType = {
				ticker: null,
				denomination: null,
				balances: null,
				transferable: null
			}

			const processState = await aoDryRun({
				processId: asset.id,
				action: 'Info',
			});

			if (processState) {
				if (processState.Name || processState.name) {
					asset.title = processState.Name || processState.name;
				}
				if (processState.Ticker || processState.ticker) state.ticker = processState.Ticker || processState.ticker;
				if (processState.Denomination || processState.denomination)
					state.denomination = processState.Denomination || processState.denomination;
				if (processState.Logo || processState.logo) asset.thumbnail = processState.Logo || processState.logo;
				if (processState.Balances) {
					state.balances = Object.fromEntries(
						Object.entries(processState.Balances).filter(([_, value]) => Number(value) !== 0)
					) as any;
				}
				if (processState.Transferable !== undefined) {
					state.transferable = processState.Transferable;
				} else {
					state.transferable = true;
				}
			}

			if (!state.balances) {
				try {
					const processBalances = await aoDryRun({
						processId: asset.id,
						action: 'Balances',
					});

					if (processBalances) state.balances = processBalances;
				} catch (e: any) {
					console.error(e);
				}
			}

			return { ...asset, ...state };
		}

		return null;
	} catch (e: any) {
		throw new Error(e.message || 'Error fetching atomic asset');
	}
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
	}

	catch (e: any) {
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
        title: getTitle(element),
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
        tags: element.node.tags.filter(tag => !mappedTagKeys.has(tag.name))
    }

    return asset;
}

function getTitle(element: GQLNodeResponseType): string {
	return getTagValue(element.node.tags, TAGS.keys.title) ||
		getTagValue(element.node.tags, TAGS.keys.name) ||
		formatAddress(element.node.id, false);
}

function getTopics(element: GQLNodeResponseType): string[] {
	return element.node.tags
		.filter(tag => tag.name.includes(TAGS.keys.topic.toLowerCase()))
		.map(tag => tag.value);
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

function buildAssetTags(args: AssetCreateArgsType): { name: string; value: string }[] {
	const tags = [
		{ name: TAGS.keys.title, value: args.title },
		{ name: TAGS.keys.description, value: args.description },
		{ name: TAGS.keys.type, value: args.type },
		{ name: TAGS.keys.contentType, value: args.contentType },
		{ name: TAGS.keys.implements, value: 'ANS-110' },
		{ name: TAGS.keys.dateCreated, value: new Date().getTime().toString() },
	];

	args.topics.forEach((topic: string) => tags.push({ name: TAGS.keys.topic, value: topic }));

	if (args.creator) {
		tags.push({ name: TAGS.keys.creator, value: args.creator });
	}

	if (args.collectionId) {
		tags.push({ name: TAGS.keys.collectionId, value: args.collectionId });
	}

	if (args.renderWith) {
		tags.push({ name: TAGS.keys.renderWith, value: args.renderWith });
	}

	if (args.thumbnail && checkValidAddress(args.thumbnail)) {
		tags.push({ name: TAGS.keys.thumbnail, value: args.thumbnail });
	}

	if (args.tags) args.tags.forEach((tag: TagType) => tags.push(tag));

	return tags;
}

function getValidationErrorMessage(args: AssetCreateArgsType): string | null {
	if (typeof args !== 'object' || args === null) return 'The provided arguments are invalid or empty.';
	
	const requiredFields = ['title', 'description', 'type', 'topics', 'contentType', 'data'];
	for (const field of requiredFields) {
		if (!(field in args)) return `Missing field '${field}'.`;
	}
	
	if (typeof args.title !== 'string' || args.title.trim() === '') return 'Title is required.';
	if (typeof args.description !== 'string') return 'The description must be a valid string.';
	if (typeof args.type !== 'string' || args.type.trim() === '') return 'The type must be a non-empty string.';
	if (!Array.isArray(args.topics) || args.topics.length === 0) return 'Topics are required.';
	if (typeof args.contentType !== 'string' || args.contentType.trim() === '') return 'Content type must be a non-empty string.';
	if (args.data === undefined || args.data === null) return 'The data field is required.';

	if ('creator' in args && typeof args.creator !== 'string') return 'The creator, if specified, must be a valid string.';
	if ('collectionId' in args && typeof args.collectionId !== 'string') return 'Collection ID, if provided, must be a valid string.';
	if ('renderWith' in args && typeof args.renderWith !== 'string') return 'Render with value, if provided, must be a valid string.';
	if ('thumbnail' in args && typeof args.thumbnail !== 'string') return 'Thumbnail, if provided, must be a valid string.';
	if ('supply' in args && (typeof args.supply !== 'number' || args.supply <= 0)) return 'Supply must be a positive number.';
	if ('transferable' in args && typeof args.transferable !== 'boolean') return 'Transferable must be a boolean value.';
	if ('tags' in args && (!Array.isArray(args.tags) || args.tags.some(tag => typeof tag !== 'object'))) return 'Tags, if provided, must be an array of objects.';
	if ('src' in args && typeof args.src !== 'string') return 'Source, if provided, must be a valid string.';
	
	return null; // All validations passed
}
