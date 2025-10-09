import { DependencyType, ModerationEntryType, ModerationStatusType, ModerationTargetType } from 'helpers/types';
import { addToZoneWith, getZoneWith } from './zones';

export function addModerationEntryWith(deps: DependencyType) {
  const addToZone = addToZoneWith(deps);

  return async (
    zoneId: string,
    targetType: ModerationTargetType,
    entry: {
      targetId: string;
      status: ModerationStatusType;
      targetContext?: string;
      moderator: string;
      reason?: string;
      metadata?: any;
    }
  ): Promise<string | null> => {
    try {
      const moderationEntry: ModerationEntryType = {
        targetId: entry.targetId,
        status: entry.status,
        moderator: entry.moderator,
        dateCreated: Date.now(),
        ...(entry.targetContext && { targetContext: entry.targetContext }),
        ...(entry.reason && { reason: entry.reason }),
        ...(entry.metadata && { metadata: entry.metadata })
      };

      const path = targetType === 'comment' ? 'Moderation.Comments' : 'Moderation.Profiles';

      return await addToZone(
        {
          path,
          data: moderationEntry
        },
        zoneId
      );
    } catch (e: any) {
      throw new Error(e.message ?? 'Error adding moderation entry');
    }
  };
}

export function getModerationEntriesWith(deps: DependencyType) {
  const getZone = getZoneWith(deps);

  return async (
    zoneId: string,
    targetType: ModerationTargetType,
    filters?: {
      targetId?: string;
      status?: ModerationStatusType;
      targetContext?: string;
      moderator?: string;
    }
  ): Promise<ModerationEntryType[] | null> => {
    try {
      const zone = await getZone(zoneId);
      const path = targetType === 'comment' ? 'Comments' : 'Profiles';
      let moderationEntries = zone?.Moderation?.[path] || [];

      if (filters) {
        if (filters.targetId) {
          moderationEntries = moderationEntries.filter((m: ModerationEntryType) => m.targetId === filters.targetId);
        }
        if (filters.status) {
          moderationEntries = moderationEntries.filter((m: ModerationEntryType) => m.status === filters.status);
        }
        if (filters.targetContext) {
          moderationEntries = moderationEntries.filter((m: ModerationEntryType) => m.targetContext === filters.targetContext);
        }
        if (filters.moderator) {
          moderationEntries = moderationEntries.filter((m: ModerationEntryType) => m.moderator === filters.moderator);
        }
      }

      return moderationEntries;
    } catch (e: any) {
      throw new Error(e.message ?? 'Error getting moderation entries');
    }
  };
}

export function updateModerationEntryWith(deps: DependencyType) {
  const getZone = getZoneWith(deps);
  const addToZone = addToZoneWith(deps);

  return async (
    zoneId: string,
    targetType: ModerationTargetType,
    targetId: string,
    update: {
      status: ModerationStatusType;
      moderator: string;
      reason?: string;
    }
  ): Promise<string | null> => {
    try {
      const zone = await getZone(zoneId);
      const path = targetType === 'comment' ? 'Moderation.Comments' : 'Moderation.Profiles';
      const entries = zone?.Moderation?.[targetType === 'comment' ? 'Comments' : 'Profiles'] || [];

      const existingIndex = entries.findIndex((m: ModerationEntryType) => m.targetId === targetId);

      const moderationEntry: ModerationEntryType = {
        targetId,
        status: update.status,
        moderator: update.moderator,
        dateCreated: existingIndex >= 0 ? entries[existingIndex].dateCreated : Date.now(),
        ...(entries[existingIndex]?.targetContext && { targetContext: entries[existingIndex].targetContext }),
        ...(update.reason && { reason: update.reason }),
        ...(entries[existingIndex]?.metadata && { metadata: entries[existingIndex].metadata })
      };

      if (existingIndex >= 0) {
        entries[existingIndex] = moderationEntry;
      } else {
        entries.push(moderationEntry);
      }

      return await addToZone(
        {
          path,
          data: entries,
          replace: true
        },
        zoneId
      );
    } catch (e: any) {
      throw new Error(e.message ?? 'Error updating moderation entry');
    }
  };
}

export function removeModerationEntryWith(deps: DependencyType) {
  const getZone = getZoneWith(deps);
  const addToZone = addToZoneWith(deps);

  return async (
    zoneId: string,
    targetType: ModerationTargetType,
    targetId: string
  ): Promise<string | null> => {
    try {
      const zone = await getZone(zoneId);
      const path = targetType === 'comment' ? 'Moderation.Comments' : 'Moderation.Profiles';
      const entries = zone?.Moderation?.[targetType === 'comment' ? 'Comments' : 'Profiles'] || [];

      const filteredEntries = entries.filter((m: ModerationEntryType) => m.targetId !== targetId);

      return await addToZone(
        {
          path,
          data: filteredEntries,
          replace: true
        },
        zoneId
      );
    } catch (e: any) {
      throw new Error(e.message ?? 'Error removing moderation entry');
    }
  };
}

export function addModerationSubscriptionWith(deps: DependencyType) {
  const getZone = getZoneWith(deps);
  const addToZone = addToZoneWith(deps);

  return async (
    zoneId: string,
    subscriptionZoneId: string
  ): Promise<string | null> => {
    try {
      const zone = await getZone(zoneId);
      const subscriptions = zone?.Moderation?.Subscriptions || [];

      if (!subscriptions.includes(subscriptionZoneId)) {
        subscriptions.push(subscriptionZoneId);
      }

      return await addToZone(
        {
          path: 'Moderation.Subscriptions',
          data: subscriptions,
          replace: true
        },
        zoneId
      );
    } catch (e: any) {
      throw new Error(e.message ?? 'Error adding moderation subscription');
    }
  };
}

export function removeModerationSubscriptionWith(deps: DependencyType) {
  const getZone = getZoneWith(deps);
  const addToZone = addToZoneWith(deps);

  return async (
    zoneId: string,
    subscriptionZoneId: string
  ): Promise<string | null> => {
    try {
      const zone = await getZone(zoneId);
      const subscriptions = zone?.Moderation?.Subscriptions || [];

      const filteredSubscriptions = subscriptions.filter((id: string) => id !== subscriptionZoneId);

      return await addToZone(
        {
          path: 'Moderation.Subscriptions',
          data: filteredSubscriptions,
          replace: true
        },
        zoneId
      );
    } catch (e: any) {
      throw new Error(e.message ?? 'Error removing moderation subscription');
    }
  };
}

export function getModerationSubscriptionsWith(deps: DependencyType) {
  const getZone = getZoneWith(deps);

  return async (zoneId: string): Promise<string[] | null> => {
    try {
      const zone = await getZone(zoneId);
      return zone?.Moderation?.Subscriptions || [];
    } catch (e: any) {
      throw new Error(e.message ?? 'Error getting moderation subscriptions');
    }
  };
}