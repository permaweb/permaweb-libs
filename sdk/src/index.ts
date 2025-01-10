import { DependencyType } from 'helpers/types';
import * as Services from './services';

function init(deps: DependencyType) {
  return {
    createZone: Services.createZoneWith(deps),
    updateZone: Services.updateZoneWith(deps),
    addToZone: Services.addToZoneWith(deps),
    getZone: Services.getZoneWith(deps),

    createAtomicAsset: Services.createAtomicAssetWith(deps),
    getAtomicAsset: Services.getAtomicAssetWith(deps),
    getAtomicAssets: Services.getAtomicAssets,
    buildAsset: Services.buildAsset,

    createProfile: Services.createProfileWith(deps),
    updateProfile: Services.updateProfileWith(deps),
    getProfileById: Services.getProfileByIdWith(deps),
    getProfileByWalletAddress: Services.getProfileByWalletAddressWith(deps),

    createCollection: Services.createCollectionWith(deps),
    updateCollection: Services.updateCollectionWith(deps),
    getCollection: Services.getCollectionWith(deps),
    getCollections: Services.getCollectionsWith(deps),

    createComment: Services.getCommentWith(deps),
    getComment: Services.getCommentWith(deps),
    getComments: Services.getCommentsWith(deps)
  }
}

export default {
  init
};


