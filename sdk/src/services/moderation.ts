import { aoSend, readProcess } from '../common/ao.ts';
import { DependencyType, ModerationEntryType, ModerationStatusType, ModerationTargetType } from '../helpers/types.ts';

/**
 * Add a moderation entry to the moderation process
 */
export function addModerationEntryWith(deps: DependencyType) {
  return async (args: {
    moderationId: string;
    targetType: ModerationTargetType;
    targetId: string;
    status: ModerationStatusType;
    targetContext?: string;
    moderator: string;
    reason?: string;
    metadata?: any;
  }): Promise<string | null> => {
    try {
      if (!args.moderationId) throw new Error('Must provide moderationId');
      if (!args.targetId) throw new Error('Must provide targetId');
      if (!args.status) throw new Error('Must provide status');
      if (!args.moderator) throw new Error('Must provide moderator');

      const tags = [
        { name: 'Target-Type', value: args.targetType },
        { name: 'Target-Id', value: args.targetId },
        { name: 'Status', value: args.status },
        { name: 'Moderator', value: args.moderator },
      ];

      if (args.targetContext) {
        tags.push({ name: 'Target-Context', value: args.targetContext });
      }
      if (args.reason) {
        tags.push({ name: 'Reason', value: args.reason });
      }

      const data = args.metadata ? JSON.stringify(args.metadata) : undefined;

      return await aoSend(deps, {
        processId: args.moderationId,
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
  return async (args: {
    moderationId: string;
    targetType: ModerationTargetType;
    targetId?: string;
    status?: ModerationStatusType;
    targetContext?: string;
    moderator?: string;
  }): Promise<ModerationEntryType[] | null> => {
    try {
      if (!args.moderationId) throw new Error('Must provide moderationId');
      if (!args.targetType) throw new Error('Must provide targetType');

      const tags: { name: string; value: string }[] = [
        { name: 'Target-Type', value: args.targetType }
      ];

      if (args.targetId) {
        tags.push({ name: 'Target-Id', value: args.targetId });
      }
      if (args.status) {
        tags.push({ name: 'Status', value: args.status });
      }
      if (args.targetContext) {
        tags.push({ name: 'Target-Context', value: args.targetContext });
      }
      if (args.moderator) {
        tags.push({ name: 'Moderator', value: args.moderator });
      }

      const result = await readProcess(deps, {
        processId: args.moderationId,
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
  return async (args: {
    moderationId: string;
    targetType: ModerationTargetType;
    targetId: string;
    status: ModerationStatusType;
    moderator: string;
    reason?: string;
  }): Promise<string | null> => {
    try {
      if (!args.moderationId) throw new Error('Must provide moderationId');
      if (!args.targetId) throw new Error('Must provide targetId');
      if (!args.status) throw new Error('Must provide status');
      if (!args.moderator) throw new Error('Must provide moderator');

      // First, check if entry exists by getting entries
      const getModerationEntries = getModerationEntriesWith(deps);
      const entries = await getModerationEntries({
        moderationId: args.moderationId,
        targetType: args.targetType,
        targetId: args.targetId
      });

      if (!entries || entries.length === 0) {
        // Create new entry if doesn't exist
        const addModerationEntry = addModerationEntryWith(deps);
        return await addModerationEntry({
          moderationId: args.moderationId,
          targetType: args.targetType,
          targetId: args.targetId,
          status: args.status,
          moderator: args.moderator,
          reason: args.reason
        });
      }

      // Update existing entry - use targetId as identifier
      const entryId = entries[0].targetId;
      const tags = [
        { name: 'Target-Id', value: entryId },
        { name: 'Status', value: args.status },
        { name: 'Moderator', value: args.moderator },
      ];

      if (args.reason) {
        tags.push({ name: 'Reason', value: args.reason });
      }

      return await aoSend(deps, {
        processId: args.moderationId,
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
  return async (args: {
    moderationId: string;
    targetType: ModerationTargetType;
    targetId: string;
  }): Promise<string | null> => {
    try {
      if (!args.moderationId) throw new Error('Must provide moderationId');
      if (!args.targetId) throw new Error('Must provide targetId');

      // Get the entry to find its ID
      const getModerationEntries = getModerationEntriesWith(deps);
      const entries = await getModerationEntries({
        moderationId: args.moderationId,
        targetType: args.targetType,
        targetId: args.targetId
      });

      if (!entries || entries.length === 0) {
        throw new Error('Moderation entry not found');
      }

      const entryId = entries[0].targetId;

      return await aoSend(deps, {
        processId: args.moderationId,
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
  return async (args: {
    moderationId: string;
    originPortal: string;
    subscriptionType?: string;
  }): Promise<string | null> => {
    try {
      if (!args.moderationId) throw new Error('Must provide moderationId');
      if (!args.originPortal) throw new Error('Must provide originPortal');

      const tags = [
        { name: 'Zone-Id', value: args.originPortal },
        { name: 'Moderation-Process-Id', value: args.moderationId }
      ];
      if (args.subscriptionType) {
        tags.push({ name: 'Subscription-Type', value: args.subscriptionType });
      }

      return await aoSend(deps, {
        processId: args.moderationId,
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
  return async (args: {
    moderationId: string;
    originPortal: string;
  }): Promise<string | null> => {
    try {
      if (!args.moderationId) throw new Error('Must provide moderationId');
      if (!args.originPortal) throw new Error('Must provide originPortal');

      return await aoSend(deps, {
        processId: args.moderationId,
        action: 'Remove-Moderation-Subscription',
        tags: [{ name: 'Zone-Id', value: args.originPortal }]
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
  return async (args: { moderationId: string }): Promise<string[] | null> => {
    try {
      if (!args.moderationId) throw new Error('Must provide moderationId');

      const result = await readProcess(deps, {
        processId: args.moderationId,
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
  return async (args: {
    moderationId: string;
    entries: Array<{
      targetType: ModerationTargetType;
      targetId: string;
      status: ModerationStatusType;
      targetContext?: string;
      reason?: string;
      metadata?: any;
    }>;
  }): Promise<string | null> => {
    try {
      if (!args.moderationId) throw new Error('Must provide moderationId');
      if (!args.entries || args.entries.length === 0) throw new Error('Must provide entries');

      const formattedEntries = args.entries.map(entry => ({
        TargetType: entry.targetType,
        TargetId: entry.targetId,
        Status: entry.status,
        TargetContext: entry.targetContext,
        Reason: entry.reason,
        Metadata: entry.metadata
      }));

      return await aoSend(deps, {
        processId: args.moderationId,
        action: 'Bulk-Add-Moderation-Entries',
        data: formattedEntries
      });
    } catch (e: any) {
      throw new Error(e.message ?? 'Error bulk adding moderation entries');
    }
  };
}
