import { aoSend } from 'common/ao';
import { resolveTransaction } from 'common/arweave';
import { getGQLData } from 'common/gql';

import { GATEWAYS, TAGS } from 'helpers/config';
import { GQLNodeResponseType, ProfileArgsType, ProfileType } from 'helpers/types';
import { globalLog } from 'helpers/utils';

import { createZone, getZone, updateZone } from './zones';

export async function createProfile(args: ProfileArgsType, wallet: any, callback?: (status: any) => void): Promise<string | null> {
	let profileId: string | null = null;

	const tags: { name: string, value: string }[] = [
		{ name: TAGS.keys.dataProtocol, value: 'Zone' },
		{ name: TAGS.keys.zoneType, value: 'User' }
	];

	const addBootTag = (key: string, value: string | undefined) => {
		if (value) {
			tags.push({ name: `${TAGS.keys.bootloader}-${key}`, value });
		}
	};

	const addImageTag = async (imageKey: 'Thumbnail' | 'Banner') => {
		const key: any = imageKey.toLowerCase();
		if ((args as any)[key]) {
			try {
				const resolvedImage = await resolveTransaction((args as any)[key]);
				addBootTag(imageKey, resolvedImage);
			} catch (e: any) {
				if (callback) callback(`Failed to resolve ${imageKey}: ${e.message}`);
				else console.error(e);
			}
		}
	};

	addBootTag('Username', args.username);
	addBootTag('DisplayName', args.displayName);
	addBootTag('Description', args.description);

	await Promise.all([addImageTag('Thumbnail'), addImageTag('Banner')]);

	try {
		profileId = await createZone({ tags: tags }, wallet, callback);

		if (profileId) {
			globalLog(`Profile ID: ${profileId}`);

			const registerId = await aoSend({
				processId: profileId,
				wallet: wallet,
				action: 'Register-Whitelisted-Subscriber',
				tags: [
					{ name: 'Topics', value: JSON.stringify(['Zone-Update']) },
					{ name: 'Subscriber-Process-Id', value: 'Wl7pTf-UEp6SIIu3S5MsTX074Sg8MhCx40NuG_YEhmk' },
				]
			});

			console.log(`Register ID: ${registerId}`);
		}
	}
	catch (e: any) {
		throw new Error(e.message ?? 'Error creating profile');
	}

	return profileId;
}

export async function updateProfile(args: ProfileArgsType, profileId: string, wallet: any, callback?: (status: any) => void): Promise<string | null> {
	if (profileId) {
		let data: any = {
			Username: args.username,
			DisplayName: args.displayName,
			Description: args.description
		};

		if (args.thumbnail) {
			try {
				data.Thumbnail = await resolveTransaction(args.thumbnail);
			} catch (e: any) {
				if (callback) callback(`Failed to resolve thumbnail: ${e.message}`);
			}
		}

		if (args.banner) {
			try {
				data.Banner = await resolveTransaction(args.banner);
			} catch (e: any) {
				if (callback) callback(`Failed to resolve banner: ${e.message}`);
			}
		}

		try {
			return await updateZone(data, profileId, wallet);
		}
		catch (e: any) {
			throw new Error(e.message ?? 'Error creating profile');
		}
	}
	else {
		throw new Error('No profile provided');
	}
}

export async function getProfileById(profileId: string): Promise<ProfileType & any | null> {
	try {
		const zone = await getZone(profileId);

		if (zone && zone.Store) {
			let profile: any = {
				id: profileId,
				walletAddress: null, // TODO: Get owner
				username: zone.Store.Username ?? 'None',
				displayName: zone.Store.DisplayName ?? 'None',
				description: zone.Store.Description ?? 'None',
			};

			if (zone.Store.Thumbnail) profile.thumbnail = zone.Store.Thumbnail;
			if (zone.Store.Banner) profile.banner = zone.Store.Banner;
			if (zone.Assets) profile.assets = zone.Assets;

			for (const [key, value] of Object.entries(zone.Store)) {
				if (!(key in profile)) {
					profile[key] = value;
				}
			}

			return profile;
		}
	}
	catch (e: any) {
		throw new Error(e.message ?? 'Error fetching profile');
	}
}

export async function getProfileByWalletAddress(walletAddress: string): Promise<ProfileType & any | null> {
	return { id: null };
	try {
		const gqlResponse = await getGQLData({
			gateway: GATEWAYS.goldsky,
			tags: [
				{ name: TAGS.keys.dataProtocol, values: ['Zone'] },
				{ name: TAGS.keys.zoneType, values: ['User'] },
			],
			owners: [walletAddress]
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
	}
	catch (e: any) {
		throw new Error(e.message ?? 'Error fetching profile');
	}
}