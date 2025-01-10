
import { DependencyType, CommentCreateArgType, AssetCreateArgsType } from "helpers/types";
import { createAtomicAssetWith } from "./assets";

export function createCommentWith(deps: DependencyType) {
  const createAtomicAsset = createAtomicAssetWith(deps);
  return async (args: CommentCreateArgType, callback?: (status: any) => void) => {
    const existingTags = args.tags ? args.tags : [];

    const tags = [
      ...existingTags, 
      { name: 'Data-Source', value: args.dataSource },
      { name: 'Root-Source', value: args.rootSouce }
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
      renderWith: args.renderWith,
      thumbnail: args.thumbnail,
      supply: args.supply,
      denomination: args.denomination,
      transferable: args.transferable,
      src: args.src,
      tags
    };
    
    return createAtomicAsset(assetArgs, callback);
  }
}

export function updateCommentWith(deps: DependencyType) {
}

export function getCommentWith(deps: DependencyType) {

}

export function getCommentsWith(deps: DependencyType) {
  
}