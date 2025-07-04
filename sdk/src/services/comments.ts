import { getGQLData } from '../common/gql.ts';
import { GATEWAYS } from '../helpers/config.ts';
import { getTxEndpoint } from '../helpers/endpoints.ts';
import {
	AssetCreateArgsType,
	CommentCreateArgType,
	CommentDetailType,
	DependencyType,
	GQLNodeResponseType,
	TagFilterType,
} from '../helpers/types.ts';

import { buildAsset, createAtomicAssetWith, getAtomicAsset } from './assets.ts';

export function createCommentWith(deps: DependencyType) {
	const createAtomicAsset = createAtomicAssetWith(deps);
	return async (args: CommentCreateArgType, callback?: (status: any) => void) => {
		const tags = args.tags ? args.tags : [];

		tags.push({ name: 'Data-Source', value: args.parentId });
		tags.push({ name: 'Root-Source', value: args.rootId ?? args.parentId });

		const assetArgs: AssetCreateArgsType = {
			name: `Comment on ${args.parentId}`,
			description: `Comment on ${args.parentId}`,
			topics: ['comment'],
			creator: args.creator,
			data: args.content,
			contentType: 'text/plain',
			assetType: 'comment',
			tags,
		};

		return createAtomicAsset(assetArgs, callback);
	};
}

export function getCommentWith(deps: DependencyType) {
	return async (id: string): Promise<CommentDetailType | null> => {
		try {
			const asset: any = await getAtomicAsset(deps, id, { useGateway: true });

			const dataSource = asset?.dataSource;
			const rootSource = asset?.rootSource;

			if (!dataSource || !rootSource) throw new Error(`dataSource and rootSource must be present on a comment`);

			return {
				content: await getCommentData(id),
				parentId: dataSource,
				rootId: rootSource,
			};
		} catch (e: any) {
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

		let assets: any[] = [];

		if (gqlResponse && gqlResponse.data.length) {
			assets = gqlResponse.data.map((element: GQLNodeResponseType) => buildAsset(element));
		}

		const comments = [];
		for (const asset of assets) {
			const dataSource = asset?.dataSource;
			const rootSource = asset?.rootSource;

			if (!dataSource || !rootSource) throw new Error(`dataSource and rootSource must be present on a comment`);

			comments.push({
				id: asset.id,
				content: await getCommentData(asset.id),
				parentId: dataSource,
				rootId: rootSource,
			});
		}

		return comments;
	};
}

async function getCommentData(id: string) {
	try {
		return await (await fetch(getTxEndpoint(id))).text();
	} catch (e: any) {
		throw new Error(e.message ?? 'Error getting comment data');
	}
}
