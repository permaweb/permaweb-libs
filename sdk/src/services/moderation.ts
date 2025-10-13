import { aoSend, readProcess } from '../common/ao.ts';
import { DependencyType, ModerationEntryType, ModerationStatusType, ModerationTargetType } from '../helpers/types.ts';
import { getZoneWith } from './zones.ts';

/**
 * Get the moderation process ID for a zone
 */
async function getModerationProcessId(deps: DependencyType, zoneId: string): Promise<string | null> {
  const getZone = getZoneWith(deps);
  const zone = await getZone(zoneId);
  return zone?.Moderation || null;
}

/**
 * Add a moderation entry to the moderation process
 */
export function addModerationEntryWith(deps: DependencyType) {
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
      const moderationProcessId = await getModerationProcessId(deps, zoneId);
      if (!moderationProcessId) {
        throw new Error('No moderation process found for this zone');
      }

      const tags = [
        { name: 'Target-Type', value: targetType },
        { name: 'Target-Id', value: entry.targetId },
        { name: 'Status', value: entry.status },
      ];

      if (entry.targetContext) {
        tags.push({ name: 'Target-Context', value: entry.targetContext });
      }
      if (entry.reason) {
        tags.push({ name: 'Reason', value: entry.reason });
      }

      const data = entry.metadata ? JSON.stringify(entry.metadata) : undefined;

      return await aoSend(deps, {
        processId: moderationProcessId,
        action: 'Add-Moderation-Entry',
        tags,
        data
      });
    } catch (e: any) {
      throw new Error(e.message ?? 'Error adding moderation entry');
    }
  };
}

/**
 * Get moderation entries from the moderation process
 */
export function getModerationEntriesWith(deps: DependencyType) {
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
      const moderationProcessId = await getModerationProcessId(deps, zoneId);
      if (!moderationProcessId) {
        return [];
      }

      const tags: { name: string; value: string }[] = [
        { name: 'Target-Type', value: targetType }
      ];

      if (filters) {
        if (filters.targetId) {
          tags.push({ name: 'Target-Id', value: filters.targetId });
        }
        if (filters.status) {
          tags.push({ name: 'Status', value: filters.status });
        }
        if (filters.targetContext) {
          tags.push({ name: 'Target-Context', value: filters.targetContext });
        }
        if (filters.moderator) {
          tags.push({ name: 'Moderator', value: filters.moderator });
        }
      }

      const result = await readProcess(deps, {
        processId: moderationProcessId,
        path: 'moderation/entries',
        fallbackAction: 'Get-Moderation-Entries'
      });

      if (!result) {
        return [];
      }

      // Parse the result if it's a string
      if (typeof result === 'string') {
        try {
          return JSON.parse(result);
        } catch {
          return [];
        }
      }

      return result;
    } catch (e: any) {
      throw new Error(e.message ?? 'Error getting moderation entries');
    }
  };
}

/**
 * Update a moderation entry in the moderation process
 */
export function updateModerationEntryWith(deps: DependencyType) {
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
      const moderationProcessId = await getModerationProcessId(deps, zoneId);
      if (!moderationProcessId) {
        throw new Error('No moderation process found for this zone');
      }

      // First, check if entry exists by getting entries
      const getModerationEntries = getModerationEntriesWith(deps);
      const entries = await getModerationEntries(zoneId, targetType, { targetId });

      if (!entries || entries.length === 0) {
        // Create new entry if doesn't exist
        const addModerationEntry = addModerationEntryWith(deps);
        return await addModerationEntry(zoneId, targetType, {
          targetId,
          status: update.status,
          moderator: update.moderator,
          reason: update.reason
        });
      }

      // Update existing entry - use targetId as identifier
      const entryId = entries[0].targetId;
      const tags = [
        { name: 'Target-Id', value: entryId },
        { name: 'Status', value: update.status },
      ];

      if (update.reason) {
        tags.push({ name: 'Reason', value: update.reason });
      }

      return await aoSend(deps, {
        processId: moderationProcessId,
        action: 'Update-Moderation-Entry',
        tags
      });
    } catch (e: any) {
      throw new Error(e.message ?? 'Error updating moderation entry');
    }
  };
}

/**
 * Remove a moderation entry from the moderation process
 */
export function removeModerationEntryWith(deps: DependencyType) {
  return async (
    zoneId: string,
    targetType: ModerationTargetType,
    targetId: string
  ): Promise<string | null> => {
    try {
      const moderationProcessId = await getModerationProcessId(deps, zoneId);
      if (!moderationProcessId) {
        throw new Error('No moderation process found for this zone');
      }

      // Get the entry to find its ID
      const getModerationEntries = getModerationEntriesWith(deps);
      const entries = await getModerationEntries(zoneId, targetType, { targetId });

      if (!entries || entries.length === 0) {
        throw new Error('Moderation entry not found');
      }

      const entryId = entries[0].targetId;

      return await aoSend(deps, {
        processId: moderationProcessId,
        action: 'Remove-Moderation-Entry',
        tags: [{ name: 'Target-Id', value: entryId }]
      });
    } catch (e: any) {
      throw new Error(e.message ?? 'Error removing moderation entry');
    }
  };
}

/**
 * Add a moderation subscription to the moderation process
 */
export function addModerationSubscriptionWith(deps: DependencyType) {
  return async (
    zoneId: string,
    moderationId: string,
    subscriptionType?: string
  ): Promise<string | null> => {
    try {
      const moderationProcessId = await getModerationProcessId(deps, zoneId);
      if (!moderationProcessId) {
        throw new Error('No moderation process found for this zone');
      }

      const tags = [
        { name: 'Zone-Id', value: moderationId },
        { name: 'Moderation-Process-Id', value: moderationId }
      ];
      if (subscriptionType) {
        tags.push({ name: 'Subscription-Type', value: subscriptionType });
      }

      return await aoSend(deps, {
        processId: moderationProcessId,
        action: 'Add-Moderation-Subscription',
        tags
      });
    } catch (e: any) {
      throw new Error(e.message ?? 'Error adding moderation subscription');
    }
  };
}

/**
 * Remove a moderation subscription from the moderation process
 */
export function removeModerationSubscriptionWith(deps: DependencyType) {
  return async (
    zoneId: string,
    moderationId: string
  ): Promise<string | null> => {
    try {
      const moderationProcessId = await getModerationProcessId(deps, zoneId);
      if (!moderationProcessId) {
        throw new Error('No moderation process found for this zone');
      }

      return await aoSend(deps, {
        processId: moderationProcessId,
        action: 'Remove-Moderation-Subscription',
        tags: [{ name: 'Zone-Id', value: moderationId }]
      });
    } catch (e: any) {
      throw new Error(e.message ?? 'Error removing moderation subscription');
    }
  };
}

/**
 * Get moderation subscriptions from the moderation process
 */
export function getModerationSubscriptionsWith(deps: DependencyType) {
  return async (zoneId: string): Promise<string[] | null> => {
    try {
      const moderationProcessId = await getModerationProcessId(deps, zoneId);
      if (!moderationProcessId) {
        return [];
      }

      const result = await readProcess(deps, {
        processId: moderationProcessId,
        path: 'moderation/subscriptions',
        fallbackAction: 'Get-Moderation-Subscriptions'
      });

      if (!result) {
        return [];
      }

      // Parse the result if it's a string
      if (typeof result === 'string') {
        try {
          return JSON.parse(result);
        } catch {
          return [];
        }
      }

      return result;
    } catch (e: any) {
      throw new Error(e.message ?? 'Error getting moderation subscriptions');
    }
  };
}

/**
 * Bulk add moderation entries to the moderation process
 */
export function bulkAddModerationEntriesWith(deps: DependencyType) {
  return async (
    zoneId: string,
    entries: Array<{
      targetType: ModerationTargetType;
      targetId: string;
      status: ModerationStatusType;
      targetContext?: string;
      reason?: string;
      metadata?: any;
    }>
  ): Promise<string | null> => {
    try {
      const moderationProcessId = await getModerationProcessId(deps, zoneId);
      if (!moderationProcessId) {
        throw new Error('No moderation process found for this zone');
      }

      const formattedEntries = entries.map(entry => ({
        TargetType: entry.targetType,
        TargetId: entry.targetId,
        Status: entry.status,
        TargetContext: entry.targetContext,
        Reason: entry.reason,
        Metadata: entry.metadata
      }));

      return await aoSend(deps, {
        processId: moderationProcessId,
        action: 'Bulk-Add-Moderation-Entries',
        data: formattedEntries
      });
    } catch (e: any) {
      throw new Error(e.message ?? 'Error bulk adding moderation entries');
    }
  };
}