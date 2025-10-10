# Moderation

**Status:** Draft  
**Version:** 0.0.1  
**Authors:** Raphael Wickihalder (raphael.wickihalder@odysee.com)

## Abstract

The Moderation Process is a dedicated AO process that manages content moderation entries and subscriptions for zones on the permaweb. It provides a decentralized, composable system for tracking and sharing moderation decisions across different applications and contexts.

## Motivation

As decentralized applications grow on the permaweb, there's a need for flexible, community-driven moderation systems that can:
- Track moderation decisions for various entity types (comments, profiles, etc.)
- Share moderation lists between zones through subscriptions
- Maintain transparency and accountability in moderation actions
- Scale independently from the main application logic

## Specification

### Process Structure

Each moderation process is an independent AO process that:
1. Stores moderation entries for different entity types
2. Maintains subscriptions to other moderation sources
3. Provides handlers for querying and managing moderation data

### Data Model

#### Moderation Entry
```lua
{
  Id = "unique-entry-id",
  TargetType = "comment" | "profile" | string,
  TargetId = "entity-being-moderated",
  Status = "active" | "inactive" | "removed" | "flagged" | "approved",
  Moderator = "moderator-address",
  DateCreated = timestamp,
  UpdatedAt = timestamp,
  TargetContext = "optional-context-id",
  Reason = "optional-reason",
  Metadata = {}
}
```

#### Subscription
```lua
{
  Id = "zone-or-source-id",
  ModerationProcessId = "moderation-process-id",
  Type = "default" | "spam" | string,
  DateCreated = timestamp
}
```

### Handlers

#### Query Handlers

##### Get-Moderation-State
Returns the complete state of the moderation process.

##### Get-Moderation-Entries
Returns filtered moderation entries.
- Tags: `Target-Type`, `Target-Id`, `Status`, `Moderator`, `Target-Context`

##### Get-Moderation-Subscriptions
Returns all active subscriptions.

##### Get-Auth-Users
Returns the list of authorized users who can perform moderation actions.

#### Mutation Handlers

##### Add-Moderation-Entry
Creates a new moderation entry.
- Required Tags: `Target-Type`, `Target-Id`
- Optional Tags: `Status`, `Target-Context`, `Reason`
- Authorization: Required

##### Update-Moderation-Entry
Updates an existing moderation entry.
- Required Tags: `Entry-Id`
- Optional Tags: `Status`, `Reason`
- Authorization: Required

##### Remove-Moderation-Entry
Removes a moderation entry.
- Required Tags: `Entry-Id`
- Authorization: Required

##### Add-Moderation-Subscription
Adds a subscription to another moderation source.
- Required Tags: `Zone-Id`, `Moderation-Process-Id`
- Optional Tags: `Subscription-Type`
- Authorization: Required

##### Remove-Moderation-Subscription
Removes a subscription.
- Required Tags: `Zone-Id`
- Authorization: Required

##### Bulk-Add-Moderation-Entries
Efficiently adds or updates multiple moderation entries.
- Data: JSON array of entry objects
- Authorization: Required

### Authorization

The moderation process uses an `AuthUsers` list initialized at process creation:
- Only authorized users can perform mutations
- Query operations are public
- Authorization is checked via the `isAuthorized` function

### Indexing

The process maintains several indices for efficient lookups:
- `EntriesById`: Direct access by entry ID
- `EntriesByTarget`: Entries grouped by target ID
- `EntriesByType`: Entries grouped by target type
- `SubscriptionsById`: Direct access to subscription details

### Integration

#### Zone Integration
Zones can spawn a moderation process during creation:
```typescript
await permaweb.createZone({
  spawnModeration: true,
  authUsers: ["user1", "user2"]
});
```

The moderation process ID is stored in the zone's state and can be accessed via:
```lua
Zone.Moderation -- Process ID of the moderation process
```

#### Cross-Zone Subscriptions
Zones can subscribe to other zones' moderation lists:
```typescript
await permaweb.addModerationSubscription(
  zoneId,
  "SubscribedZoneId",
  "zone"
);
```

### Use Cases

1. **Comment Moderation**: Track flagged or removed comments in a comments process
2. **Profile Blocking**: Maintain lists of blocked or restricted profiles
3. **Shared Blocklists**: Multiple zones subscribing to trusted moderation sources
4. **Community Moderation**: Distributed moderation with multiple authorized moderators
5. **Content Filtering**: Applications can query moderation status before displaying content

### Benefits

- **Separation of Concerns**: Moderation logic isolated from application logic
- **Scalability**: Each zone has its own moderation process
- **Composability**: Subscriptions enable sharing and aggregation of moderation data
- **Transparency**: All moderation actions are recorded with timestamps and moderator info
- **Flexibility**: Support for multiple entity types and custom metadata

### Example Flow

1. Zone spawns moderation process during creation
2. Authorized moderators add entries for problematic content
3. Applications query moderation status when displaying content
4. Other zones subscribe to trusted moderation sources
5. Moderation decisions propagate through subscription network

### Future Enhancements

- Voting mechanisms for community-driven moderation
- Reputation systems for moderators
- Appeal processes for contested moderation
- Automated moderation based on patterns
- Cross-process moderation aggregation