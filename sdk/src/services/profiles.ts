import { resolveTransaction } from 'common/arweave';
import { getGQLData } from 'common/gql';

import { GATEWAYS, TAGS } from 'helpers/config';
import { DependencyType, GQLNodeResponseType, ProfileArgsType, ProfileType } from 'helpers/types';
import { getBootTag, mapFromProcessCase } from 'helpers/utils';

import { createZoneWith, getZoneWith, updateZoneWith } from './zones';

// TODO: Bootloader registry

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

		tags.push(getBootTag('Username', args.username));
		tags.push(getBootTag('DisplayName', args.displayName));
		tags.push(getBootTag('Description', args.description));

		await Promise.all([addImageTag('Thumbnail'), addImageTag('Banner')]);

		try {
			profileId = await createZone({ tags: tags }, callback);

			// if (profileId) {
			// 	globalLog(`Profile ID: ${profileId}`);

			// 	await waitForProcess(profileId);

			// 	const registerId = await aoSend({
			// 		processId: profileId,
			// 		wallet: wallet,
			// 		action: 'Register-Whitelisted-Subscriber',
			// 		tags: [
			// 			{ name: 'Topics', value: JSON.stringify(['Zone-Update']) },
			// 			{ name: 'Subscriber-Process-Id', value: 'Wl7pTf-UEp6SIIu3S5MsTX074Sg8MhCx40NuG_YEhmk' },
			// 		]
			// 	});

			// 	console.log(`Register ID: ${registerId}`);
			// }
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
				Username: args.username,
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
			return { id: profileId, ...mapFromProcessCase(zone.Store ?? {}), assets: mapFromProcessCase(zone.Assets ?? []) };
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
				gateway: GATEWAYS.arweave,
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
