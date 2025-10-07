import { DependencyType, ModerationEntryType, ModerationActionType } from 'helpers/types';
import { addToZoneWith, getZoneWith } from './zones';

export function addModerationActionWith(deps: DependencyType) {
  const addToZone = addToZoneWith(deps);

  return async (
    zoneId: string,
    commentId: string,
    action: ModerationActionType,
    moderator: string,
    options?: {
      reason?: string;
      dataSource?: string;
      rootSource?: string;
    }
  ): Promise<string | null> => {
    try {
      const moderationEntry: ModerationEntryType = {
        commentId,
        action,
        moderator,
        dateCreated: Date.now(),
        ...(options?.reason && { reason: options.reason }),
        ...(options?.dataSource && { dataSource: options.dataSource }),
        ...(options?.rootSource && { rootSource: options.rootSource })
      };

      return await addToZone(
        {
          path: 'Moderation',
          data: moderationEntry
        },
        zoneId
      );
    } catch (e: any) {
      throw new Error(e.message ?? 'Error adding moderation action');
    }
  };
}

export function getModerationActionsWith(deps: DependencyType) {
  const getZone = getZoneWith(deps);

  return async (zoneId: string): Promise<ModerationEntryType[] | null> => {
    try {
      const zone = await getZone(zoneId);
      return zone?.Moderation || [];
    } catch (e: any) {
      throw new Error(e.message ?? 'Error getting moderation actions');
    }
  };
}

