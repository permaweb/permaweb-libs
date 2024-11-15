import { resolveTransaction } from 'common/arweave';
import { getGQLData } from 'common/gql';

import { GATEWAYS, TAGS } from 'helpers/config';
import { GQLNodeResponseType, ProfileArgsType, ProfileType, ZoneType } from 'helpers/types';

import { createZone, getZone, updateZone } from './zones';

export async function createProfile(args: ProfileArgsType, wallet: any, callback?: (status: any) => void): Promise<string | null> {
	let profileId: string | null = null;

	const tags: { name: string, value: string }[] = [
		{ name: TAGS.keys.dataProtocol, value: 'Zone' },
		{ name: TAGS.keys.name, value: 'User' }
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
	}
	catch (e: any) {
		throw new Error(e.message ?? 'Error creating profile');
	}

	return profileId;
}

export async function updateProfile(args: ProfileArgsType, profileId: string, wallet: any, callback?: (status: any) => void): Promise<string | null> {
	if (profileId) {
		let data: ProfileArgsType = {
			username: args.username,
			displayName: args.displayName,
			description: args.description
		};

		if (args.thumbnail) {
			try {
				data.thumbnail = await resolveTransaction(args.thumbnail);
			} catch (e: any) {
				if (callback) callback(`Failed to resolve thumbnail: ${e.message}`);
			}
		}

		if (args.banner) {
			try {
				data.banner = await resolveTransaction(args.banner);
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

		if (zone && zone.store) {
			let profile: any = {
				id: profileId,
				walletAddress: null, // TODO: Get owner
				username: zone.store.Username ?? 'None',
				displayName: zone.store.DisplayName ?? 'None',
				description: zone.store.Description ?? 'None',
			};

			if (zone.store.Thumbnail) profile.thumbnail = zone.store.Thumbnail;
			if (zone.store.Banner) profile.banner = zone.store.Banner;
			if (zone.Assets) profile.assets = zone.Assets;

			for (const [key, value] of Object.entries(zone.store)) {
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
	try {
		const gqlResponse = await getGQLData({
			gateway: GATEWAYS.arweave,
			tags: [
				{ name: TAGS.keys.dataProtocol, values: ['Zone'] },
				{ name: TAGS.keys.name, values: ['User'] },
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

		return null;
	}
	catch (e: any) {
		throw new Error(e.message ?? 'Error fetching profile');
	}
}