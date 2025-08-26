import { aoCreateProcess, aoDryRun, aoSend, readProcess } from '../common/ao.ts';
import { resolveTransactionWith } from '../common/arweave.ts';
import { AO, TAGS } from '../helpers/config.ts';
import { getTxEndpoint } from '../helpers/endpoints.ts';
import { CollectionDetailType, CollectionType, DependencyType, TagType } from '../helpers/types.ts';
import { cleanProcessField, cleanTagValue, globalLog, mapFromProcessCase } from '../helpers/utils.ts';

const DEFAULT_COLLECTION_BANNER = 'eXCtpVbcd_jZ0dmU2PZ8focaKxBGECBQ8wMib7sIVPo';
const DEFAULT_COLLECTION_THUMBNAIL = 'lJovHqM9hwNjHV5JoY9NGWtt0WD-5D4gOqNL2VWW5jk';

export function createCollectionWith(deps: DependencyType) {
	return async (
		args: {
			title: string;
			description: string;
			creator: string;
			thumbnail: any;
			banner: any;
			skipRegistry?: boolean;
			skipActivity?: boolean;
		},
		callback?: (status: any) => void,
	) => {
		if (!deps.signer) throw new Error(`No signer provided`);

		const resolveTransaction = resolveTransactionWith(deps);

		const dateTime = new Date().getTime().toString();
		const tags: TagType[] = [
			{ name: TAGS.keys.creator, value: args.creator },
			{
				name: TAGS.keys.ans110.title,
				value: cleanTagValue(args.title),
			},
			{
				name: TAGS.keys.name,
				value: cleanTagValue(args.title),
			},
			{
				name: TAGS.keys.ans110.description,
				value: cleanTagValue(args.description),
			},
		];

		let thumbnailTx = null;
		let bannerTx = null;

		try {
			thumbnailTx = args.banner ? await resolveTransaction(args.thumbnail) : DEFAULT_COLLECTION_THUMBNAIL;
			bannerTx = args.banner ? await resolveTransaction(args.banner) : DEFAULT_COLLECTION_BANNER;

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
		} catch (e: any) {
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
				{ tags: tags },
				callback ? (status) => callback(status) : undefined,
			);

			globalLog('Sending eval message to collection...');
			if (callback) callback('Sending eval message to collection...');
			await deps.ao.message({
				process: collectionId,
				signer: deps.signer,
				tags: [{ name: 'Action', value: 'Eval' }],
				data: processSrc,
			});

			if (!args.skipRegistry) {
				globalLog('Sending collection to registry...');
				if (callback) callback('Sending collection to registry...');

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
					process: AO.collectionRegistry,
					signer: deps.signer,
					tags: registryTags,
				});
			}

			if (!args.skipActivity) {
				globalLog('Creating collection activity process...');
				if (callback) callback('Creating collection activity process...');

				const activityTags = [
					{ name: 'CollectionId', value: collectionId },
					{ name: 'DateCreated', value: dateTime },
					{ name: 'UCM-Process', value: 'Collection-Activity' },
					{ name: 'On-Boot', value: AO.src.collectionActivity },
				];

				const collectionActivityId = await aoCreateProcess(
					deps,
					{ tags: activityTags },
					callback ? (status) => callback(status) : undefined,
				);

				globalLog('Adding activity to collection process...');
				if (callback) callback('Adding activity to collection process...');
				await deps.ao.message({
					process: collectionId,
					signer: deps.signer,
					tags: [{ name: 'Action', value: 'Eval' }],
					data: `ActivityProcess = '${collectionActivityId}'`,
				});
			}

			return collectionId;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error creating collection');
		}
	};
}

export function updateCollectionAssetsWith(deps: DependencyType) {
	return async (args: {
		collectionId: string;
		assetIds: string[];
		creator: string;
		updateType: 'Add' | 'Remove';
	}): Promise<string> => {
		return await aoSend(deps, {
			processId: args.creator,
			action: 'Run-Action',
			tags: [
				{ name: 'Forward-To', value: args.collectionId },
				{ name: 'Forward-Action', value: 'Update-Assets' },
			],
			data: {
				Target: args.collectionId,
				Action: 'Update-Assets',
				Input: {
					AssetIds: args.assetIds,
					UpdateType: args.updateType,
				},
			},
		});
	};
}

export function getCollectionWith(deps: DependencyType) {
	return async (collectionId: string): Promise<CollectionDetailType | null> => {
		const response = await readProcess(deps, {
			processId: collectionId,
			path: 'collection',
			fallbackAction: 'Info',
		});

		if (response) {
			return mapFromProcessCase(response);
		}

		return null;
	};
}

export function getCollectionsWith(deps: DependencyType) {
	return async (args: { creator?: string }): Promise<CollectionType[] | null> => {
		const action = args.creator ? 'Get-Collections-By-User' : 'Get-Collections';

		const response = await aoDryRun(deps, {
			processId: AO.collectionRegistry,
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
