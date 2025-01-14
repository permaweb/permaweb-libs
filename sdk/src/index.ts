import { Buffer } from 'buffer';

import * as Helpers from 'helpers';

import * as Common from './common';
import * as Services from './services';

/* Used for build - Do not remove ! */
if (!globalThis.Buffer) globalThis.Buffer = Buffer;

function init(deps: Helpers.DependencyType) {
	return {
		/* Services */
		createZone: Services.createZoneWith(deps),
		updateZone: Services.updateZoneWith(deps),
		addToZone: Services.addToZoneWith(deps),
		getZone: Services.getZoneWith(deps),

		createAtomicAsset: Services.createAtomicAssetWith(deps),
		getAtomicAsset: Services.getAtomicAssetWith(deps),
		getAtomicAssets: Services.getAtomicAssets,

		createProfile: Services.createProfileWith(deps),
		updateProfile: Services.updateProfileWith(deps),
		getProfileById: Services.getProfileByIdWith(deps),
		getProfileByWalletAddress: Services.getProfileByWalletAddressWith(deps),

		createComment: Services.createCommentWith(deps),
		getComment: Services.getCommentWith(deps),
		getComments: Services.getCommentsWith(deps),

		createCollection: Services.createCollectionWith(deps),
		updateCollectionAssets: Services.updateCollectionAssetsWith(deps),
		getCollection: Services.getCollectionWith(deps),
		getCollections: Services.getCollectionsWith(deps),

		/* Common */
		resolveTransaction: Common.resolveTransactionWith(deps),
		getGQLData: Common.getGQLData,
		createProcess: Common.aoCreateProcessWith(deps),

		/* Utils */
		mapFromProcessCase: Helpers.mapFromProcessCase,
		mapToProcessCase: Helpers.mapToProcessCase,
	};
}

export default { init };

export * from './helpers/types';
