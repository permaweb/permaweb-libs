
import { DependencyType, CommentCreateArgType, AssetCreateArgsType, CommentHeaderType, CommentDetailType, TagType, GQLNodeResponseType, TagFilterType, AssetDetailType, AssetHeaderType } from "helpers/types";
import { buildAsset, createAtomicAssetWith, getAtomicAssetWith, getAtomicAssets } from "./assets";
import { getGQLData } from "common/gql";
import { AO, GATEWAYS } from "helpers/config";

export function createCommentWith(deps: DependencyType) {
  const createAtomicAsset = createAtomicAssetWith(deps);
  return async (args: CommentCreateArgType, callback?: (status: any) => void) => {
    const existingTags = args.tags ? args.tags : [];

    const tags = [
      ...existingTags, 
      { name: 'Data-Source', value: args.dataSource },
      { name: 'Root-Source', value: args.rootSource }
    ];

    const assetArgs: AssetCreateArgsType = {
      title: args.title,
      description: args.description,
      type: args.type,
      topics: args.topics,
      contentType: args.contentType,
      data: args.data,
      creator: args.creator,
      collectionId: args.collectionId,
      supply: args.supply,
      denomination: args.denomination,
      transferable: args.transferable,
      src: args.src ?? AO.src.asset,
      tags
    };

    if(args.renderWith) assetArgs.renderWith = args.renderWith;
    if(args.thumbnail) assetArgs.thumbnail = args.thumbnail;
    
    return createAtomicAsset(assetArgs, callback);
  }
}

export function getCommentWith(deps: DependencyType) {
  const getAtomicAsset = getAtomicAssetWith(deps);
  return async (args: { id: string }) => {
    const asset = await getAtomicAsset(args.id);

    const dataSource = asset?.tags?.find((t: TagType) => {
      return t.name === 'Data-Source'
    })?.value;

    const rootSource = asset?.tags?.find((t: TagType) => {
      return t.name === 'Root-Source'
    })?.value;

    if (!dataSource || !rootSource) throw new Error(`dataSource and rootSource must be present on a comment`);

    const comment: CommentDetailType = {
      ...asset,
      dataSource,
      rootSource
    };

    return comment;
  }
}

export function getCommentsWith(_deps: DependencyType) {
  return async(args: { routeSource?: string, dataSource?: string }) => {
    if(!args.routeSource && !args.dataSource) {
      throw new Error(`Must provide either rootSource or dataSource`);
    }

    let tags: TagFilterType[] = []

    if(args.routeSource) tags.push({ 
      name: 'Root-Source', 
      values: [args.routeSource ? args.routeSource : ''] 
    });
    
    if(args.dataSource) tags.push({ 
      name: 'Data-Source', 
      values: [args.dataSource ? args.dataSource : ''] 
    })

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

    return assets.map((asset: AssetHeaderType) => {
      const dataSource = asset?.tags?.find((t: TagType) => {
        return t.name === 'Data-Source'
      })?.value;
  
      const rootSource = asset?.tags?.find((t: TagType) => {
        return t.name === 'Root-Source'
      })?.value;
  
      if (!dataSource || !rootSource) throw new Error(`dataSource and rootSource must be present on a comment`);
  
      const comment: CommentHeaderType = {
        ...asset,
        dataSource,
        rootSource
      };
  
      return comment;
    })
  }
}