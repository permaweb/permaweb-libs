import { resolveTransaction } from 'common/arweave';

// import { TAGS } from 'helpers/config';
import { ProfileArgsType, ProfileType, ZoneType } from 'helpers/types';

import { createZone, getZone, updateZone } from './zones';

// TODO: Bootloader
export async function createProfile(args: ProfileArgsType, wallet: any, callback?: (status: any) => void): Promise<string | null> {
	let profileId: string | null = null;

	// const tags: { name: string, value: string }[] = [];

	// const addBootTag = (key: string, value: string | undefined) => {
	// 	if (value) {
	// 		tags.push({ name: `${TAGS.keys.bootloader}-${key}`, value });
	// 	}
	// };

	// const addImageTag = async (imageKey: 'Thumbnail' | 'Banner') => {
	// 	const key: any = imageKey.toLowerCase();
	// 	if ((args as any)[key]) {
	// 		try {
	// 			const resolvedImage = await resolveTransaction((args as any)[key]);
	// 			addBootTag(imageKey, resolvedImage);
	// 		} catch (e: any) {
	// 			callback(`Failed to resolve ${imageKey}: ${e.message}`);
	// 		}
	// 	}
	// };

	// addBootTag('Username', args.username);
	// addBootTag('DisplayName', args.displayName);
	// addBootTag('Description', args.description);

	// await Promise.all([addImageTag('Thumbnail'), addImageTag('Banner')]);

	try {
		// profileId = await createZone({ tags: tags }, wallet, callback);
		profileId = await createZone({}, wallet, callback);
		if (profileId) {
			const profileUpdateId = await updateProfile(args, profileId, wallet, callback ?? undefined);
			console.log(`Profile update: ${profileUpdateId}`);
		}
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
			const profileUpdateId = await updateZone({
				zoneId: profileId,
				data: data
			}, wallet);

			return profileUpdateId;
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
				walletAddress: null, // TODO: get owner
				username: zone.store.username ?? 'None',
				displayName: zone.store.displayName ?? 'None',
				description: zone.store.description ?? 'None',
			};

			if (zone.store.thumbnail) profile.thumbnail = zone.store.thumbnail;
			if (zone.store.banner) profile.banner = zone.store.banner;
			if (zone.assets) profile.assets = zone.assets;

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

// TODO
export async function getProfileByWalletAddress(walletAddress: string): Promise<ProfileType & any | null> {
	console.log(`Get profile by wallet: ${walletAddress}`);
	const profileId = 'iSJy3wjcNuOm7NeEmRQbslmnoH6nyZuEYDL_3LyxAp4';
	return await getProfileById(profileId);
}