import * as Common from './common/index.ts';
import * as Helpers from './helpers/index.ts';
import * as Services from './services/index.ts';

export * as Types from './helpers/types.ts';

function init(deps: Helpers.DependencyType) {
	return {
		/* Zones */
		createZone: Services.createZoneWith(deps),
		updateZone: Services.updateZoneWith(deps),
		addToZone: Services.addToZoneWith(deps),
		getZone: Services.getZoneWith(deps),
		setZoneRoles: Services.setZoneRolesWith(deps),
		joinZone: Services.joinZoneWith(deps),
		
		/* Profiles */
		createProfile: Services.createProfileWith(deps),
		updateProfile: Services.updateProfileWith(deps),
		getProfileById: Services.getProfileByIdWith(deps),
		getProfileByWalletAddress: Services.getProfileByWalletAddressWith(deps),
		
		/* Assets */
		createAtomicAsset: Services.createAtomicAssetWith(deps),
		getAtomicAsset: Services.getAtomicAssetWith(deps),
		getAtomicAssets: Services.getAtomicAssets,
		
		/* Comments */
		createComment: Services.createCommentWith(deps),
		getComment: Services.getCommentWith(deps),
		getComments: Services.getCommentsWith(deps),
		
		/* Collections */
		createCollection: Services.createCollectionWith(deps),
		updateCollectionAssets: Services.updateCollectionAssetsWith(deps),
		getCollection: Services.getCollectionWith(deps),
		getCollections: Services.getCollectionsWith(deps),
		
		/* Common */
		resolveTransaction: Common.resolveTransactionWith(deps),
		getGQLData: Common.getGQLData,
		getAggregatedGQLData: Common.getAggregatedGQLData,
		createProcess: Common.aoCreateProcessWith(deps),
		readProcess: Common.aoDryRunWith(deps),
		sendMessage: Common.aoSendWith(deps),
		waitForProcess: Common.waitForProcess,
		
		/* Utils */
		mapFromProcessCase: Helpers.mapFromProcessCase,
		mapToProcessCase: Helpers.mapToProcessCase,
	};
}

export default { init };
