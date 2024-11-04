import { ProfileCreateArgsType } from 'helpers/types';

import { createZone, updateZone } from './zones';

// TODO: Bootloader
// TODO: Thumbanil: Data or TxId
// TODO: Banner: Data or TxId
export async function createProfile(args: ProfileCreateArgsType, wallet: any, callback: (status: any) => void): Promise<string | null> {
	let profileId: string | null = null;
	
	try {
		profileId = await createZone(wallet, callback);
	}
	catch (e: any) {
		throw new Error(e);
	}

	if (profileId) {
		try {
			const profileUpdateId = await updateZone({
				zoneId: profileId,
				data: {
					username: args.username,
					displayName: args.displayName,
					description: args.description
				}
			}, wallet);

			console.log(`Profile update: ${profileUpdateId}`);
		}
		catch (e: any) {
			throw new Error(e);
		}
	}

	return profileId;
}