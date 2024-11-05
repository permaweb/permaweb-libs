import { resolveTransaction } from 'common/arweave';

// import { TAGS } from 'helpers/config';
import { ProfileCreateArgsType, ProfileType, ZoneType } from 'helpers/types';

import { createZone, getZone, updateZone } from './zones';

// TODO: Bootloader
export async function createProfile(args: ProfileCreateArgsType, wallet: any, callback: (status: any) => void): Promise<string | null> {
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
	}
	catch (e: any) {
		throw new Error(e.message ?? 'Error creating profile');
	}

	if (profileId) {
		let data: ProfileCreateArgsType = {
			username: args.username,
			displayName: args.displayName,
			description: args.description
		};

		if (args.thumbnail) {
			try {
				data.thumbnail = await resolveTransaction(args.thumbnail);
			} catch (e: any) {
				callback(`Failed to resolve thumbnail: ${e.message}`);
			}
		}

		if (args.banner) {
			try {
				data.banner = await resolveTransaction(args.banner);
			} catch (e: any) {
				callback(`Failed to resolve banner: ${e.message}`);
			}
		}

		try {
			const profileUpdateId = await updateZone({
				zoneId: profileId,
				data: data
			}, wallet);

			console.log(`Profile update: ${profileUpdateId}`);
		}
		catch (e: any) {
			throw new Error(e.message ?? 'Error creating profile');
		}
	}

	return profileId;
}

// TODO
export async function getProfileByWalletAddress(args: { address: string }): Promise<ProfileType & any | null> {
	const zoneId = 'iSJy3wjcNuOm7NeEmRQbslmnoH6nyZuEYDL_3LyxAp4';

	try {
		const zone = await getZone(zoneId);

		if (zone && zone.store) {
			let profile: any = {
				id: zoneId,
				walletAddress: args.address,
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