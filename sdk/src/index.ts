import * as Common from './common/index.ts';
import * as Helpers from './helpers/index.ts';
import * as Services from './services/index.ts';

export * as Types from './helpers/types.ts';

/* For clients to be able to detect new zone versions */
export const CurrentZoneVersion = Helpers.AO.src.zone.version;

function init(deps: Helpers.DependencyType) {
	return {
		/* Zones */
		createZone: Services.createZoneWith(deps),
		updateZone: Services.updateZoneWith(deps),
		addToZone: Services.addToZoneWith(deps),
		getZone: Services.getZoneWith(deps),
		setZoneRoles: Services.setZoneRolesWith(deps),
		joinZone: Services.joinZoneWith(deps),
		updateZonePatchMap: Services.updateZonePatchMapWith(deps),
		updateZoneVersion: Services.updateZoneVersionWith(deps),

		/* Profiles */
		createProfile: Services.createProfileWith(deps),
		updateProfile: Services.updateProfileWith(deps),
		updateProfileVersion: Services.updateProfileVersionWith(deps),
		getProfileById: Services.getProfileByIdWith(deps),
		getProfileByWalletAddress: Services.getProfileByWalletAddressWith(deps),

		/* Assets */
		createAtomicAsset: Services.createAtomicAssetWith(deps),
		getAtomicAsset: Services.getAtomicAssetWith(deps),
		getAtomicAssets: Services.getAtomicAssets,

		/* Comments */
		createComment: Services.createCommentWith(deps),
		getComments: Services.getCommentsWith(deps),
		updateCommentStatus: Services.updateCommentStatusWith(deps),
		removeComment: Services.removeCommentWith(deps),

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
		readState: Common.readProcessWith(deps),
		sendMessage: Common.aoSendWith(deps),

		/* Utils */
		mapFromProcessCase: Helpers.mapFromProcessCase,
		mapToProcessCase: Helpers.mapToProcessCase,
	};
}

export default { init };
