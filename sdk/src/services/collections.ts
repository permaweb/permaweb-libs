import { aoCreateProcess, aoDryRun, aoSend } from 'common/ao';
import { resolveTransaction } from 'common/arweave';

import { AO, TAGS } from 'helpers/config';
import { getTxEndpoint } from 'helpers/endpoints';
import { CollectionDetailType, CollectionType, DependencyType, TagType } from 'helpers/types';
import { cleanProcessField, cleanTagValue } from 'helpers/utils';

const DEFAULT_COLLECTION_BANNER = 'eXCtpVbcd_jZ0dmU2PZ8focaKxBGECBQ8wMib7sIVPo';
const DEFAULT_COLLECTION_THUMBNAIL = 'lJovHqM9hwNjHV5JoY9NGWtt0WD-5D4gOqNL2VWW5jk';

export function createCollectionWith(deps: DependencyType) {
	return async (args: {
		title: string;
		description: string;
		creator: string;
		banner: any;
		thumbnail: any;
	}, callback?: (status: any) => void) => {
		if (!deps.signer) throw new Error(`Must provide a signer when initializing to create collections`);

		const dateTime = new Date().getTime().toString();

		const tags: TagType[] = [
			{ name: TAGS.keys.contentType, value: 'application/json' },
			{ name: TAGS.keys.creator, value: args.creator },
			{
				name: TAGS.keys.ans110.title,
				value: cleanTagValue(args.title),
			},
			{
				name: TAGS.keys.ans110.description,
				value: cleanTagValue(args.description),
			},
			{ name: TAGS.keys.ans110.type, value: TAGS.values.document },
			{ name: TAGS.keys.dateCreated, value: dateTime },
			{
				name: TAGS.keys.name,
				value: cleanTagValue(args.title),
			},
			{ name: 'Action', value: 'Add-Collection' },
		];

		let thumbnailTx = null;
		let bannerTx = null;

		try {
			thumbnailTx = args.banner ? await resolveTransaction(deps, args.thumbnail) : DEFAULT_COLLECTION_THUMBNAIL;
			bannerTx = args.banner ? await resolveTransaction(deps, args.banner) : DEFAULT_COLLECTION_BANNER;

			if (args.thumbnail)
				tags.push({
					name: TAGS.keys.thumbnail,
					value: thumbnailTx,
				});

			if (args.banner)
				tags.push({
					name: TAGS.keys.banner,
					value: bannerTx,
				});
		}
		catch (e: any) {
			console.error(e);
		}

		const processSrcFetch = await fetch(getTxEndpoint(AO.src.collection));
		if (!processSrcFetch.ok) throw new Error(`Unable to fetch process src`);

		let processSrc = await processSrcFetch.text();

		processSrc = processSrc.replace(/'<NAME>'/g, cleanProcessField(args.title));
		processSrc = processSrc.replace(/'<DESCRIPTION>'/g, cleanProcessField(args.description));
		processSrc = processSrc.replace(/<CREATOR>/g, args.creator);
		processSrc = processSrc.replace(/<THUMBNAIL>/g, thumbnailTx ? thumbnailTx : DEFAULT_COLLECTION_THUMBNAIL);
		processSrc = processSrc.replace(/<BANNER>/g, bannerTx ? bannerTx : DEFAULT_COLLECTION_THUMBNAIL);
		processSrc = processSrc.replace(/<DATECREATED>/g, dateTime);
		processSrc = processSrc.replace(/<LASTUPDATE>/g, dateTime);

		try {
			const collectionId = await aoCreateProcess(
				deps,
				{ spawnTags: tags },
				callback ? (status) => callback(status) : undefined,
			);

			await deps.ao.message({
				process: collectionId,
				signer: deps.signer,
				tags: [{ name: 'Action', value: 'Eval' }],
				data: processSrc,
			});

			const registryTags = [
				{ name: 'Action', value: 'Add-Collection' },
				{ name: 'CollectionId', value: collectionId },
				{ name: 'Name', value: cleanTagValue(args.title) },
				{ name: 'Creator', value: args.creator },
				{ name: 'DateCreated', value: dateTime },
			];

			if (bannerTx) registryTags.push({ name: 'Banner', value: bannerTx });
			if (thumbnailTx) registryTags.push({ name: 'Thumbnail', value: thumbnailTx });
			
			await deps.ao.message({
				process: AO.collectionsRegistry,
				signer: deps.signer,
				tags: registryTags,
			});

			await deps.ao.message({
				process: collectionId,
				signer: deps.signer,
				tags: [
					{ name: 'Action', value: 'Add-Collection-To-Profile' },
					{ name: 'ProfileProcess', value: args.creator },
				],
			});

			return collectionId;
		}
		catch (e: any) {
			throw new Error(e.message ?? 'Error creating collection')
		}
	};
}

export function updateCollectionAssetsWith(deps: DependencyType) {
	return async (args: { collectionId: string; assetIds: string[]; creator: string; updateType: 'Add' | 'Remove' }): Promise<string> => {
		return await aoSend(deps, {
			processId: args.creator,
			action: 'Run-Action',
			tags: [
				{ name: 'ForwardTo', value: args.collectionId },
				{ name: 'ForwardAction', value: 'Update-Assets' }
			],
			data: {
				Target: args.collectionId,
				Action: 'Update-Assets',
				Input: JSON.stringify({
					AssetIds: args.assetIds,
					UpdateType: args.updateType,
				}),
			},
		});
	};
}

export function getCollectionWith(deps: DependencyType) {
	return async (collectionId: string): Promise<CollectionDetailType | null> => {
		const response = await aoDryRun(deps, {
			processId: collectionId,
			action: 'Info',
		});

		const collection = {
			id: collectionId,
			title: response.Name,
			description: response.Description,
			creator: response.Creator,
			dateCreated: response.DateCreated,
			thumbnail: response.Thumbnail ?? DEFAULT_COLLECTION_THUMBNAIL,
			banner: response.Banner ?? DEFAULT_COLLECTION_THUMBNAIL,
		};

		return {
			...collection,
			assetIds: response.Assets,
		};
	};
}

export function getCollectionsWith(deps: DependencyType) {
	return async (args: { creator?: string }): Promise<CollectionType[] | null> => {
		const action = args.creator ? 'Get-Collections-By-User' : 'Get-Collections';

		const response = await aoDryRun(deps, {
			processId: AO.collectionsRegistry,
			action: action,
			tags: args.creator ? [{ name: 'Creator', value: args.creator }] : null,
		});

		if (response && response.Collections && response.Collections.length) {
			const collections = response.Collections.map((collection: any) => {
				return {
					id: collection.Id,
					title: collection.Name.replace(/\[|\]/g, ''),
					description: collection.Description,
					creator: collection.Creator,
					dateCreated: collection.DateCreated,
					banner: collection.Banner,
					thumbnail: collection.Thumbnail,
				};
			});

			return collections;
		}

		return null;
	};
}
