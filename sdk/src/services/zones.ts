import { aoCreateProcess, aoDryRun, aoSend, handleProcessEval, readProcess } from '../common/ao.ts';
import { AO, TAGS } from '../helpers/config.ts';
import { DependencyType, TagType } from '../helpers/types.ts';
import { checkValidAddress, globalLog, mapFromProcessCase } from '../helpers/utils.ts';

export function createZoneWith(deps: DependencyType) {
	return async (args: { data?: any; tags?: TagType[] }, callback?: (status: any) => void): Promise<string | null> => {
		try {
			const tags = [{ name: TAGS.keys.onBoot, value: AO.src.zone.id }];
			if (args.tags && args.tags.length) args.tags.forEach((tag: TagType) => tags.push(tag));

			const zoneId = await aoCreateProcess(
				deps,
				{ data: args.data, tags: tags },
				callback ? (status: any) => callback(status) : undefined,
			);

			return zoneId;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error creating zone');
		}
	};
}

export function updateZoneWith(deps: DependencyType) {
	return async (args: object, zoneId: string): Promise<string | null> => {
		try {
			const mappedData = Object.entries(args).map(([key, value]) => ({ key, value }));

			const zoneUpdateId = await aoSend(deps, {
				processId: zoneId,
				action: 'Zone-Update',
				data: mappedData,
			});

			return zoneUpdateId;
		} catch (e: any) {
			throw new Error(e);
		}
	};
}

export function addToZoneWith(deps: DependencyType) {
	return async (args: { path: string; data: object }, zoneId: string): Promise<string | null> => {
		try {
			const zoneUpdateId = await aoSend(deps, {
				processId: zoneId,
				action: 'Zone-Append',
				tags: [{ name: 'Path', value: args.path }],
				data: args.data,
			});

			return zoneUpdateId;
		} catch (e: any) {
			throw new Error(e);
		}
	};
}

export function updateZonePatchMapWith(deps: DependencyType) {
	return async (args: object, zoneId: string): Promise<string | null> => {
		try {
			const zonePatchMapUpdateId = await aoSend(deps, {
				processId: zoneId,
				action: 'Zone-Update-Patch-Map',
				data: args,
			});

			return zonePatchMapUpdateId;
		} catch (e: any) {
			throw new Error(e);
		}
	};
}

export function setZoneRolesWith(deps: DependencyType) {
	return async (
		args: { granteeId: string; roles: string[]; type: 'wallet' | 'process'; sendInvite: boolean }[],
		zoneId: string,
	): Promise<string | null> => {
		const zoneValid = checkValidAddress(zoneId);
		if (!zoneValid) throw new Error('Invalid zone address');

		const data = [];
		for (const entry of args) {
			const granteeValid = checkValidAddress(entry.granteeId);

			if (!granteeValid) throw new Error('Invalid granteeId address');
			if (entry.type !== 'wallet' && entry.type !== 'process') throw new Error('Invalid role type');

			data.push({
				Id: entry.granteeId,
				Roles: entry.roles,
				Type: entry.type,
				SendInvite: entry.sendInvite,
			});
		}

		try {
			const zoneUpdateId = await aoSend(deps, {
				processId: zoneId,
				action: 'Role-Set',
				tags: [],
				data: data,
			});

			return zoneUpdateId;
		} catch (e: any) {
			throw new Error(e);
		}
	};
}

export function joinZoneWith(deps: DependencyType) {
	return async (args: { zoneToJoinId: string; storePath?: string }, zoneId: string): Promise<string | null> => {
		const zoneValid = checkValidAddress(zoneId) && checkValidAddress(args.zoneToJoinId);

		if (!zoneValid) throw new Error('Invalid zone address');

		const tags = [{ name: 'Zone-Id', value: args.zoneToJoinId }];
		if (args.storePath) tags.push({ name: 'Store-Path', value: args.storePath });

		try {
			const zoneUpdateId = await aoSend(deps, {
				processId: zoneId,
				action: 'Zone-Join',
				tags: tags,
			});

			return zoneUpdateId;
		} catch (e: any) {
			throw new Error(e);
		}
	};
}

export function updateZoneVersionWith(deps: DependencyType) {
	return async (args: { zoneId: string }): Promise<string | null> => {
		try {
			globalLog(`Updating zone to version ${AO.src.zone.version} with source ${AO.src.zone.id}`);

			await handleProcessEval(deps, {
				processId: args.zoneId,
				evalTxId: AO.src.zone.id,
			});

			const versionUpdate = await handleProcessEval(deps, {
				processId: args.zoneId,
				evalSrc: `
				Zone.Version = '${AO.src.zone.version}'
				if Zone.PatchMap then
					local patchData = Zone.Functions.getPatchData('overview')
            		Send({ device = 'patch@1.0', overview = require('json').encode(patchData) })
				else
					SyncState(nil)
				end
				`,
			});

			return versionUpdate;
		} catch (e: any) {
			throw new Error(e);
		}
	};
}

export function getZoneWith(deps: DependencyType) {
	return async (zoneId: string): Promise<any | null> => {
		try {
			const processInfo = await readProcess(deps, { processId: zoneId, path: 'zone', fallbackAction: 'Info' });

			return mapFromProcessCase(processInfo);
		} catch (e: any) {
			throw new Error(e.message ?? 'Error getting zone');
		}
	};
}
