import { AO, GATEWAYS, TAGS } from 'helpers/config.ts';

import { aoCreateProcess, aoDryRun, aoSend } from '../common/ao.ts';
import { resolveTransaction } from '../common/arweave.ts';
import { getGQLData } from '../common/gql.ts';
import { DependencyType, GQLNodeResponseType, ProfileArgsType, ProfileType } from '../helpers/types.ts';
import { getBootTag, globalLog, mapFromProcessCase } from '../helpers/utils.ts';

import { createZoneWith, getZoneWith, updateZoneWith } from './zones.ts';

export function createProfileWith_LEGACY(deps: DependencyType) {
	return async (args: ProfileArgsType, callback?: (status: any) => void): Promise<string | null> => {
		try {
			if (!deps.signer) throw new Error(`No signer provided`);

			const dateTime = new Date().getTime().toString();
			const tags: { name: string; value: string }[] = [
				{ name: 'Date-Created', value: dateTime },
				{ name: 'Action', value: 'Create-Profile' },
			];

			let thumbnailTx = null;
			let bannerTx = null;

			try {
				if (args.thumbnail) thumbnailTx = await resolveTransaction(deps, args.thumbnail);
				if (args.banner) bannerTx = await resolveTransaction(deps, args.banner);
			}
			catch (e: any) {
				console.error(e);
			}

			const profileId = await aoCreateProcess(deps, {
				tags: tags,
				evalTxId: AO.src.profile
			}, (status: any) => globalLog(status));

			const updateData: any = {
				UserName: args.userName,
				DisplayName: args.displayName,
				Description: args.description
			}

			if (thumbnailTx) updateData.ProfileImage = thumbnailTx;
			if (bannerTx) updateData.CoverImage = bannerTx;

			globalLog('Updating profile...');
			if (callback) callback('Updating profile...');
			const profileUpdateId = await aoSend(deps, {
				processId: profileId,
				action: 'Update-Profile',
				data: updateData
			});
			globalLog(`Profile update: ${profileUpdateId}`);

			return profileId;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error creating profile');
		}
	};
}

export function updateProfileWith_LEGACY(deps: DependencyType) {
	return async (args: ProfileArgsType, profileId: string, callback?: (status: any) => void): Promise<string | null> => {
		if (profileId) {
			let updateData: any = {
				UserName: args.userName,
				DisplayName: args.displayName,
				Description: args.description,
			};

			if (args.thumbnail) {
				try {
					updateData.Thumbnail = await resolveTransaction(deps, args.thumbnail);
				} catch (e: any) {
					if (callback) callback(`Failed to resolve thumbnail: ${e.message}`);
				}
			}

			if (args.banner) {
				try {
					updateData.Banner = await resolveTransaction(deps, args.banner);
				} catch (e: any) {
					if (callback) callback(`Failed to resolve banner: ${e.message}`);
				}
			}

			try {
				globalLog('Updating profile...');
				if (callback) callback('Updating profile...');
				const profileUpdateId = await aoSend(deps, {
					processId: profileId,
					action: 'Update-Profile',
					data: updateData
				});
				globalLog(`Profile update: ${profileUpdateId}`);
				return profileUpdateId;
			} catch (e: any) {
				throw new Error(e.message ?? 'Error updating profile');
			}
		} else {
			throw new Error('No profile provided');
		}
	};
}

export function getProfileByIdWith_LEGACY(deps: DependencyType) {
	return async (profileId: string): Promise<ProfileType | null> => {
		try {
			const processInfo = await aoDryRun(deps, {
				processId: profileId,
				action: 'Info',
			});
			const { Profile = {}, ...rest } = processInfo;
			const flattenedProcessInfo = { ...rest, ...Profile };
			return { id: profileId, ...mapFromProcessCase(flattenedProcessInfo) };
		} catch (e: any) {
			throw new Error(e.message ?? 'Error fetching profile');
		}
	};
}

export function getProfileByWalletAddressWith_LEGACY(deps: DependencyType) {
	const getProfileById = getProfileByIdWith_LEGACY(deps);

	return async (walletAddress: string): Promise<(ProfileType & any) | null> => {
		try {
			const profileLookup = await aoDryRun(deps, {
				processId: AO.profileRegistry,
				action: 'Get-Profiles-By-Delegate',
				data: { Address: walletAddress }
			});

			let activeProfileId: string;
			if (profileLookup && profileLookup.length > 0 && profileLookup[0].ProfileId) {
				activeProfileId = profileLookup[0].ProfileId;
				return await getProfileById(activeProfileId);
			}
		} catch (e: any) {
			throw new Error(e.message ?? 'Error fetching profile');
		}
	};
}

export function createProfileWith(deps: DependencyType) {
	const createZone = createZoneWith(deps);

	return async (args: ProfileArgsType, callback?: (status: any) => void): Promise<string | null> => {
		let profileId: string | null = null;

		const tags: { name: string; value: string }[] = [
			{ name: TAGS.keys.dataProtocol, value: 'Zone' },
			{ name: TAGS.keys.zoneType, value: 'User' },
		];

		const addImageTag = async (imageKey: 'Thumbnail' | 'Banner') => {
			const key: any = imageKey.toLowerCase();
			if ((args as any)[key]) {
				try {
					const resolvedImage = await resolveTransaction(deps, (args as any)[key]);
					tags.push(getBootTag(imageKey, resolvedImage));
				} catch (e: any) {
					if (callback) callback(`Failed to resolve ${imageKey}: ${e.message}`);
					else console.error(e);
				}
			}
		};

		tags.push(getBootTag('Username', args.userName));
		tags.push(getBootTag('DisplayName', args.displayName));
		tags.push(getBootTag('Description', args.description));

		await Promise.all([addImageTag('Thumbnail'), addImageTag('Banner')]);

		try {
			profileId = await createZone({ tags: tags }, callback);
		} catch (e: any) {
			throw new Error(e.message ?? 'Error creating profile');
		}

		return profileId;
	};
}

export function updateProfileWith(deps: DependencyType) {
	const updateZone = updateZoneWith(deps);

	return async (args: ProfileArgsType, profileId: string, callback?: (status: any) => void): Promise<string | null> => {
		if (profileId) {
			let data: any = {
				Username: args.userName,
				DisplayName: args.displayName,
				Description: args.description,
			};

			if (args.thumbnail) {
				try {
					data.Thumbnail = await resolveTransaction(deps, args.thumbnail);
				} catch (e: any) {
					if (callback) callback(`Failed to resolve thumbnail: ${e.message}`);
				}
			}

			if (args.banner) {
				try {
					data.Banner = await resolveTransaction(deps, args.banner);
				} catch (e: any) {
					if (callback) callback(`Failed to resolve banner: ${e.message}`);
				}
			}

			try {
				return await updateZone(data, profileId);
			} catch (e: any) {
				throw new Error(e.message ?? 'Error creating profile');
			}
		} else {
			throw new Error('No profile provided');
		}
	};
}

export function getProfileByIdWith(deps: DependencyType) {
	const getZone = getZoneWith(deps);

	return async (profileId: string): Promise<ProfileType | null> => {
		try {
			const zone = await getZone(profileId);
			return { id: profileId, ...zone.store, assets: zone.assets };
		} catch (e: any) {
			throw new Error(e.message ?? 'Error fetching profile');
		}
	};
}

export function getProfileByWalletAddressWith(deps: DependencyType) {
	const getProfileById = getProfileByIdWith(deps);

	return async (walletAddress: string): Promise<(ProfileType & any) | null> => {
		try {
			const gqlResponse = await getGQLData({
				gateway: GATEWAYS.goldsky,
				tags: [
					{ name: TAGS.keys.dataProtocol, values: ['Zone'] },
					{ name: TAGS.keys.zoneType, values: ['User'] },
				],
				owners: [walletAddress],
			});

			if (gqlResponse?.data?.length > 0) {
				gqlResponse.data.sort((a: GQLNodeResponseType, b: GQLNodeResponseType) => {
					const timestampA = a.node.block?.timestamp ?? 0;
					const timestampB = b.node.block?.timestamp ?? 0;
					return timestampB - timestampA;
				});

				return await getProfileById(gqlResponse.data[0].node.id);
			}

			return { id: null };
		} catch (e: any) {
			throw new Error(e.message ?? 'Error fetching profile');
		}
	};
}
