import { aoCreateProcess, aoDryRun, aoSend } from 'common/ao';

import { AO, TAGS } from 'helpers/config';
import { DependencyType, TagType } from 'helpers/types';

export function createZoneWith(deps: DependencyType) {
  return async (args: { tags?: TagType[] }, callback?: (status: any) => void): Promise<string | null> => {
    try {
      const tags = [{ name: TAGS.keys.bootloaderInit, value: AO.src.zone }];
      if (args.tags && args.tags.length) args.tags.forEach((tag: TagType) => tags.push(tag));
  
      const zoneId = await aoCreateProcess(
        deps,
        {
          spawnTags: tags
        },
        callback ? (status) => callback(status) : undefined
      );
      
      return zoneId;
    } catch (e: any) {
      throw new Error(e.message ?? 'Error creating zone');
    }
  }
}

export function updateZoneWith(deps: DependencyType) {
  return async (args: object, zoneId: string): Promise<string | null> => {
    try {
      const mappedData = Object.entries(args).map(([key, value]) => ({ key, value }));
  
      const zoneUpdateId = await aoSend(deps, {
        processId: zoneId,
        action: 'Zone-Update',
        data: mappedData
      });
  
      return zoneUpdateId;
    }
    catch (e: any) {
      throw new Error(e);
    }
  }
}

export function addToZoneWith(deps: DependencyType) {
  return async (args: { path: string, data: object }, zoneId: string): Promise<string | null> => {
    try {
      const zoneUpdateId = await aoSend(deps, {
        processId: zoneId,
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
}

export function getZoneWith(deps: DependencyType) {
  return async (zoneId: string): Promise<any | null> => {
    try {
      const processState = await aoDryRun(deps, {
        processId: zoneId,
        action: 'Info',
      });
  
      return processState;
    }
    catch (e: any) {
      throw new Error(e);
    }
  }
}