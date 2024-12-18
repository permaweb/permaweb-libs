import { aoCreateProcess, aoDryRun, aoSend } from 'common/ao';

import { AO, TAGS } from 'helpers/config';
import { TagType } from 'helpers/types';

export async function createZone(args: { tags?: TagType[] }, wallet: any, callback?: (status: any) => void): Promise<string | null> {
	try {
		const tags = [{ name: TAGS.keys.bootloaderInit, value: AO.src.zone }];
		if (args.tags && args.tags.length) args.tags.forEach((tag: TagType) => tags.push(tag));

		const zoneId = await aoCreateProcess(
			{
				wallet: wallet,
				spawnTags: tags
			},
			callback ? (status) => callback(status) : undefined,
		);
		
		return zoneId;
	} catch (e: any) {
		throw new Error(e.message ?? 'Error creating zone');
	}
}

export async function updateZone(args: object, zoneId: string, wallet: any): Promise<string | null> {
	try {
		const mappedData = Object.entries(args).map(([key, value]) => ({ key, value }));

		const zoneUpdateId = await aoSend({
			processId: zoneId,
			wallet: wallet,
			action: 'Zone-Update',
			data: mappedData
		});

		return zoneUpdateId;
	}
	catch (e: any) {
		throw new Error(e);
	}
}

export async function addToZone(args: { path: string, data: object }, zoneId: string, wallet: any): Promise<string | null> {
	try {
		const zoneUpdateId = await aoSend({
			processId: zoneId,
			wallet: wallet,
			action: 'Zone-Append',
			tags: [{ name: 'Path', value: args.path }],
			data: args.data
		});

		return zoneUpdateId;
	}
	catch (e: any) {
		throw new Error(e);
	}
}

export async function getZone(zoneId: string): Promise<any | null> {
	try {
		const processState = await aoDryRun({
			processId: zoneId,
			action: 'Info',
		});

		return processState;
	}
	catch (e: any) {
		throw new Error(e);
	}
}