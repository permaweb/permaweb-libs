import { resolveTransaction } from 'common/arweave';

import { TAGS } from 'helpers/config';
import { ProfileCreateArgsType } from 'helpers/types';

import { createZone, updateZone } from './zones';

// const spawnTags = [
// 	{name: "Action", value: "Create-Zone"},
// 	{
// 		name: "On-Boot",
// 		value: LUA_ZONE_BUNDLE
// 	},
// 	{name: "Bootloader-Description", value: "A nice channel"},
// 	{name: "Bootloader-Cover", value: "img.jpg"},
// 	{name: "Bootloader-Tags", value: "Cool"},
// 	{name: "Bootloader-Tags", value: "Crypto"},
// 	{name: "Bootlaoder-Registry", value: ZONE_REGISTRY_PROCESS}
// ];

// TODO: Bootloader
export async function createProfile(args: ProfileCreateArgsType, wallet: any, callback: (status: any) => void): Promise<string | null> {
	let profileId: string | null = null;

	const tags: { name: string, value: string }[] = [];

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
				callback(`Failed to resolve ${imageKey}: ${e.message}`);
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

	// if (profileId) {
	// 	let data: ProfileCreateArgsType = {
	// 		username: args.username,
	// 		displayName: args.displayName,
	// 		description: args.description
	// 	};

	// 	if (args.thumbnail) {
	// 		try {
	// 			data.thumbnail = await resolveTransaction(args.thumbnail);
	// 		} catch (e: any) {
	// 			callback(`Failed to resolve thumbnail: ${e.message}`);
	// 		}
	// 	}

	// 	if (args.banner) {
	// 		try {
	// 			data.banner = await resolveTransaction(args.banner);
	// 		} catch (e: any) {
	// 			callback(`Failed to resolve banner: ${e.message}`);
	// 		}
	// 	}

	// 	try {
	// 		const profileUpdateId = await updateZone({
	// 			zoneId: profileId,
	// 			data: data
	// 		}, wallet);

	// 		console.log(`Profile update: ${profileUpdateId}`);
	// 	}
	// 	catch (e: any) {
	// 		throw new Error(e.message ?? 'Error creating profile');
	// 	}
	// }

	return profileId;
}

// TODO
export async function getProfileByWalletAddress(args: { address: string }): Promise<any | null> {
	const emptyProfile = {
		id: null,
		walletAddress: args.address,
		displayName: null,
		username: null,
		bio: null,
		avatar: null,
		banner: null,
		portals: null,
	};

	return emptyProfile;
}