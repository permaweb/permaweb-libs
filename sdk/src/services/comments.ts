import { getGQLData } from 'common/gql';

import { AO, GATEWAYS } from 'helpers/config';
import { getTxEndpoint } from 'helpers/endpoints';
import {
	AssetCreateArgsType,
	AssetHeaderType,
	CommentCreateArgType,
	CommentDetailType,
	CommentHeaderType,
	DependencyType,
	GQLNodeResponseType,
	TagFilterType,
	TagType,
} from 'helpers/types';

import { buildAsset, createAtomicAssetWith, getAtomicAsset } from './assets';

export function createCommentWith(deps: DependencyType) {
	const createAtomicAsset = createAtomicAssetWith(deps);
	return async (args: CommentCreateArgType, callback?: (status: any) => void) => {
		const tags = args.tags ? args.tags : [];

		tags.push({ name: 'Data-Source', value: args.parentId });
		tags.push({ name: 'Root-Source', value: args.rootId ?? args.parentId });

		const assetArgs: AssetCreateArgsType = {
			title: `Comment on ${args.parentId}`,
			description: `Comment on ${args.parentId}`,
			type: 'comment',
			topics: ['comment'],
			contentType: 'text/plain',
			data: args.content,
			creator: args.creator,
			src: AO.src.asset,
			tags,
		};

		return createAtomicAsset(assetArgs, callback);
	};
}

export function getCommentWith(deps: DependencyType) {
	return async (id: string): Promise<CommentDetailType | null> => {
		try {
			const asset = await getAtomicAsset(deps, id);

			const dataSource = asset?.tags?.find((t: TagType) => {
				return t.name === 'Data-Source';
			})?.value;

			const rootSource = asset?.tags?.find((t: TagType) => {
				return t.name === 'Root-Source';
			})?.value;

			if (!dataSource || !rootSource) throw new Error(`dataSource and rootSource must be present on a comment`);

			return {
				...asset,
				content: await getCommentData(id),
				dataSource,
				rootSource,
			};
		}
		catch (e: any) {
			throw new Error(e.message ?? 'Error getting comment');
		}
	};
}

export function getCommentsWith(_deps: DependencyType) {
	return async (args: { parentId?: string; rootId?: string }) => {
		if (!args.parentId && !args.rootId) {
			throw new Error(`Must provide either parentId or rootId`);
		}

		const tags: TagFilterType[] = [];

		if (args.parentId)
			tags.push({
				name: 'Data-Source',
				values: [args.parentId ?? ''],
			});

		if (args.rootId)
			tags.push({
				name: 'Root-Source',
				values: [args.rootId ?? ''],
			});

		const gqlResponse = await getGQLData({
			gateway: GATEWAYS.goldsky,
			ids: null,
			tags,
			owners: null,
			cursor: null,
		});

		let assets: AssetHeaderType[] = [];

		if (gqlResponse && gqlResponse.data.length) {
			assets = gqlResponse.data.map((element: GQLNodeResponseType) => buildAsset(element));
		}

		const comments = [];
		for (const asset of assets) {
			const dataSource = asset?.tags?.find((t: TagType) => {
				return t.name === 'Data-Source';
			})?.value;

			const rootSource = asset?.tags?.find((t: TagType) => {
				return t.name === 'Root-Source';
			})?.value;

			if (!dataSource || !rootSource) throw new Error(`dataSource and rootSource must be present on a comment`);

			comments.push({
				...asset,
				content: await getCommentData(asset.id),
				dataSource,
				rootSource,
			})
		}

		return comments;
	};
}

async function getCommentData(id: string) {
	try {
		return await (await fetch(getTxEndpoint(id))).text();
	}
	catch (e: any) {
		throw new Error(e.message ?? 'Error getting comment data')
	}
}
