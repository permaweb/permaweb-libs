import { GATEWAYS, TAGS } from 'helpers/config.ts';

import { resolveTransactionWith } from '../common/arweave.ts';
import { getGQLData } from '../common/gql.ts';
import { DependencyType, GQLNodeResponseType, ProfileArgsType, ProfileType } from '../helpers/types.ts';
import { getBootTag, isValidMediaData } from '../helpers/utils.ts';

import { createZoneWith, getZoneWith, updateZoneVersionWith, updateZoneWith } from './zones.ts';

export function createProfileWith(deps: DependencyType) {
	const createZone = createZoneWith(deps);
	const resolveTransaction = resolveTransactionWith(deps);

	return async (args: ProfileArgsType, callback?: (status: any) => void): Promise<string | null> => {
		let profileId: string | null = null;

		const tags: { name: string; value: string }[] = [
			{ name: TAGS.keys.zoneType, value: TAGS.values.user },
		];

		const addImageTag = async (imageKey: 'Thumbnail' | 'Banner') => {
			const key: any = imageKey.toLowerCase();
			const value = (args as any)[key];
			if (value && isValidMediaData(value)) {
				try {
					const resolvedImage = await resolveTransaction((args as any)[key]);
					tags.push(getBootTag(imageKey, resolvedImage));
				} catch (e: any) {
					if (callback) callback(`Failed to resolve ${imageKey}: ${e.message}`);
					else console.error(e);
				}
			}
		};

		if (args.username) tags.push(getBootTag('Username', args.username));
		if (args.displayName) tags.push(getBootTag('DisplayName', args.displayName));
		if (args.description) tags.push(getBootTag('Description', args.description));

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
	const resolveTransaction = resolveTransactionWith(deps);

	return async (args: ProfileArgsType, profileId: string, callback?: (status: any) => void): Promise<string | null> => {
		if (profileId) {
			let data: any = {
				Username: args.username,
				DisplayName: args.displayName,
				Description: args.description,
			};

			if (args.thumbnail && isValidMediaData(args.thumbnail)) {
				try {
					data.Thumbnail = await resolveTransaction(args.thumbnail);
				} catch (e: any) {
					if (callback) callback(`Failed to resolve thumbnail: ${e.message}`);
				}
			}
			else data.Thumbnail = 'None';

			if (args.banner && isValidMediaData(args.banner)) {
				try {
					data.Banner = await resolveTransaction(args.banner);
				} catch (e: any) {
					if (callback) callback(`Failed to resolve banner: ${e.message}`);
				}
			}
			else data.Banner = 'None';

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

export function updateProfileVersionWith(deps: DependencyType) {
	const updateZoneVersion = updateZoneVersionWith(deps);

	return async (args: { profileId: string }): Promise<string | null> => {
		try {
			return await updateZoneVersion({ zoneId: args.profileId });
		} catch (e: any) {
			throw new Error(e);
		}
	};
}

export function getProfileByIdWith(deps: DependencyType) {
	const getZone = getZoneWith(deps);

	return async (profileId: string): Promise<ProfileType | null> => {
		try {
			const zone = await getZone(profileId);
			if (!zone) {
				throw new Error('Error fetching profile - Not found');
			}
			return {
				id: profileId,
				owner: zone.owner,
				assets: zone.assets,
				roles: zone.roles,
				invites: zone.invites,
				version: zone.version,
				...zone.store,
			};
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
				gateway: GATEWAYS.ao,
				tags: [
					{ name: TAGS.keys.dataProtocol, values: [TAGS.values.dataProtocol] },
					{ name: TAGS.keys.zoneType, values: [TAGS.values.user] } // TODO
					// { name: TAGS.keys.zoneType, values: ['Dev-User-1'] }
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
