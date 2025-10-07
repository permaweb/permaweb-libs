import { DependencyType, ModerationEntryType, ModerationActionType } from 'helpers/types';
import { addToZoneWith, getZoneWith } from './zones';

export function addModerationActionWith(deps: DependencyType) {
  const addToZone = addToZoneWith(deps);

  return async (
    zoneId: string,
    commentId: string,
    commentsId: string,
    action: ModerationActionType,
    moderator: string,
    reason?: string
  ): Promise<string | null> => {
    try {
      const moderationEntry: ModerationEntryType = {
        commentId,
        commentsId,
        action,
        moderator,
        dateCreated: Date.now(),
        ...(reason && { reason })
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

