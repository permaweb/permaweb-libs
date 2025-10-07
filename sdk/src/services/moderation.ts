import { DependencyType, ModerationEntryType, ModerationActionType, ModerationTargetType } from 'helpers/types';
import { addToZoneWith, getZoneWith } from './zones';

export function addModerationActionWith(deps: DependencyType) {
  const addToZone = addToZoneWith(deps);

  return async (
    zoneId: string,
    entry: {
      targetType: ModerationTargetType;
      targetId: string;
      targetContext?: string;
      action: ModerationActionType;
      moderator: string;
      reason?: string;
      metadata?: any;
    }
  ): Promise<string | null> => {
    try {
      const moderationEntry: ModerationEntryType = {
        targetType: entry.targetType,
        targetId: entry.targetId,
        action: entry.action,
        moderator: entry.moderator,
        dateCreated: Date.now(),
        ...(entry.targetContext && { targetContext: entry.targetContext }),
        ...(entry.reason && { reason: entry.reason }),
        ...(entry.metadata && { metadata: entry.metadata })
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

  return async (
    zoneId: string,
    filters?: {
      targetType?: ModerationTargetType;
      targetId?: string;
      targetContext?: string;
      action?: ModerationActionType;
      moderator?: string;
    }
  ): Promise<ModerationEntryType[] | null> => {
    try {
      const zone = await getZone(zoneId);
      let moderationActions = zone?.Moderation || [];

      if (filters) {
        if (filters.targetType) {
          moderationActions = moderationActions.filter((m: ModerationEntryType) => m.targetType === filters.targetType);
        }
        if (filters.targetId) {
          moderationActions = moderationActions.filter((m: ModerationEntryType) => m.targetId === filters.targetId);
        }
        if (filters.targetContext) {
          moderationActions = moderationActions.filter((m: ModerationEntryType) => m.targetContext === filters.targetContext);
        }
        if (filters.action) {
          moderationActions = moderationActions.filter((m: ModerationEntryType) => m.action === filters.action);
        }
        if (filters.moderator) {
          moderationActions = moderationActions.filter((m: ModerationEntryType) => m.moderator === filters.moderator);
        }
      }

      return moderationActions;
    } catch (e: any) {
      throw new Error(e.message ?? 'Error getting moderation actions');
    }
  };
}

