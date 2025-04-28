import { aoCreateProcess, aoDryRun, aoSend, readProcess } from '../common/ao.ts';
import { AO, TAGS } from '../helpers/config.ts';
import { DependencyType, TagType } from '../helpers/types.ts';
import {checkValidAddress, mapFromProcessCase} from '../helpers/utils.ts';

export function createZoneWith(deps: DependencyType) {
	return async (args: { data?: any; tags?: TagType[] }, callback?: (status: any) => void): Promise<string | null> => {
		try {
			const tags = [{ name: TAGS.keys.bootloaderInit, value: AO.src.zone }];
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

export function getZoneWith(deps: DependencyType) {
	return async (zoneId: string): Promise<any | null> => {
		try {
			const processInfo = await readProcess(deps, {
				processId: zoneId,
				path: 'zone',
				fallbackAction: 'Info'
			});

			return mapFromProcessCase(processInfo);
		} catch (e: any) {
			throw new Error(e.message ?? 'Error getting zone');
		}
	};
}

export function setZoneRolesWith(deps: DependencyType) {
	return async (args: { roles: string[]; granteeId: string; }, zoneId: string): Promise<string | null> => {
		const granteeValid = checkValidAddress(args.granteeId);
		const zoneValid = checkValidAddress(zoneId);

		if (!granteeValid) throw new Error('Invalid granteeId address')
		if (!zoneValid) throw new Error('Invalid zone address')
		try {
			const zoneUpdateId = await aoSend(deps, {
				processId: zoneId,
				action: 'Role-Set',
				tags: [],
				data: { id: args.granteeId, roles: args.roles },
			});

			return zoneUpdateId;
		} catch (e: any) {
			throw new Error(e);
		}
	};
}
