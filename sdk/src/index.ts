import { Buffer } from 'buffer';
import { DependencyType } from 'helpers/types';
import * as Services from './services';

if (!globalThis.Buffer) globalThis.Buffer = Buffer;

function init(deps: DependencyType) {
  return {
    createZone: Services.createZoneWith(deps),
    updateZone: Services.updateZoneWith(deps),
    addToZone: Services.addToZoneWith(deps),
    getZone: Services.getZoneWith(deps),

    createAtomicAsset: Services.createAtomicAssetWith(deps),
    getAtomicAsset: Services.getAtomicAssetWith(deps),
    getAtomicAssets: Services.getAtomicAssets,
    getAoAtomicAsset: Services.getAoAtomicAssetWith(deps),
    buildAsset: Services.buildAsset,

    createProfile: Services.createProfileWith(deps),
    updateProfile: Services.updateProfileWith(deps),
    getProfileById: Services.getProfileByIdWith(deps),
    getProfileByWalletAddress: Services.getProfileByWalletAddressWith(deps),

    createCollection: Services.createCollectionWith(deps),
    updateCollection: Services.updateCollectionWith(deps),
    getCollection: Services.getCollectionWith(deps),
    getCollections: Services.getCollectionsWith(deps),

    createComment: Services.createCommentWith(deps),
    getComment: Services.getCommentWith(deps),
    getComments: Services.getCommentsWith(deps),

    addModerationAction: Services.addModerationActionWith(deps),
    getModerationActions: Services.getModerationActionsWith(deps)
  }
}

export default {
  init
};

export * from './helpers/types';

