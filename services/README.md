# Zones

# About
**wallet**  -(changes)->  **zone**   -forwards-to->  **zone-registry**  -forwards-to->  **search-index-registries**

# Usage
## Zone Registry
### `Prepare-Database`

**Action**: `Prepare-Database`

**Description**: Initializes the database by creating necessary tables for zone ownership and delegation.

**Parameters**:
- `msg`: The message object containing the action and data.

### `Create-Zone`

**Action**: `Create-Zone`

**Description**: Creates a new profile in the zone.

**Parameters**:
- `msg`: The message object containing the action and data.

**Returns**:
```json
{
  "Target": "<profile_id>",
  "Action": "Zone-Created-Success"
}
```

### `Get-Profiles-By-Delegate`

**Action**: `Get-Zones-For-User`

**Description**: Retrieves Zone(s) associated with a wallet address.

**Parameters**:
- `msg`: The message object containing the action and data.
- `msg.Data`: `"{\"Address\": \"<some_wallet>\"}"`

**Returns**:
```json
{
  "Target": "<profile_id>",
  "Action": "Zone-Fetch-Success",
  "Data": "[{\"ZoneId\": \"some_id\", \"UserId\": \"some_address\", \"Role\": \"Owner\"}]"
}
```


### `Update Profile Metadata`

**Action**: `Zone-Metadata.Set`

**Description**: Updates an existing profile in the zone.

**Parameters**:
- `msg`: The message object containing the action and data.
- `msg.Data`: JSON object containing updated profile details.

### `Update Zone Role`

**Action**: `Zone-Role.Set`

**Description**: Updates the role of a delegate for a profile.

**Parameters**:
- `msg`: The message object containing the action and data.
- `msg.Data`: JSON object containing `Id`, `Op`, and optionally `Role`.

### `Read-Auth`

**Action**: `Read-Auth`

**Description**: Retrieves authorization data for profiles.

**Parameters**:
- `msg`: The message object containing the action.

---

# Zone Package
Should have profile package broken out
## Usage
### Write

To set metadata entries in the Zone, send a message with the `Update-Profile` action and the appropriate data.

**Parameters**:
- `data`: A JSON string containing an array of `entries`, where each entry has a `key` and `value`.

**Data Schema**:
```json
{
  "type": "object",
  "properties": {
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "key": { "type": "string" },
          "value": { "type": "string" }
        },
        "required": ["key", "value"]
      }
    }
  },
  "required": ["entries"]
}
```
#### Example
```json
{
  "process": "<your-zone-id>",
  "data": "{\"entries\": [{\"key\": \"hat\", \"value\": \"blue\"}, {\"key\": \"boots\", \"value\": \"black\"}]}",
  "tags": [
    {
      "name": "Action",
      "value": "Update-Profile"
    }
  ]
}
```
### Read
To retrieve metadata entries from the Zone, send a message with the `Get-Profile` action and the appropriate data.  

**Parameters**:

- `data`: A JSON string containing an array of `keys` to retrieve.

**Data Schema**:
```json
{
  "type": "object",
  "properties": {
    "keys": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["keys"]
}
```
#### Example
**Input**:
```json
{
  "process": "<your-process>",
  "data": "{\"keys\": [\"hat\", \"boots\"]}",
  "tags": [
    {
      "name": "Action",
      "value": "Get-Profile"
    }
  ]
}
```
**Output**:
```json
{
  "Data": {
    "Results": {
      "boots": "black",
      "hat": "blue"
    }
  }
}
```

## Testing KV
### AOS CLI Example
To set metadata entries in the Zone, send a message with the `Zone-Metadata.Set` action and the appropriate data.

```
.load path/to/bundle.lua
.editor
<editor mode> use '.done' to submit or '.cancel' to cancel
local P = require("@permaweb/zone")
P.zoneKV:set("tree", "green")
print(P.zoneKV:get("tree"))
.done
RETURNS:
black
```

# Profiles

## ⚠⚠ WARNING ⚠ ⚠ 

This concept is in very early development and experimentation phase, and as such, will be buggy and most likely evolve in ways that may not be supported without losing data or having to re-create profiles. The current version includes some base profile metadata, can store assets, and supports single wallet as an owner. 

## Overview

[AO Profile](profile.lua) is a protocol built on the permaweb designed to allow users to create an identity, interact with applications built on AO, operate as a smart wallet, and serve as a personal process. Instead of a wallet address owning assets or having uploads, the profile will encompass this information. This means that certain actions require first interacting with the profile, validating that a wallet has authorization to carry it out, and finally the profile will send a message onward to other processes, which can then validate its request. 

A separate [Profile Registry aggregation process](registry.lua) is used to keep track of the new profile processes that are created, as well as any updates. This registry process will serve as an all encompassing database that can be queried for profile data. You can read profile metadata directly from the AO Profile process, or from the registry. 

## Profile Metadata
| **Field**     | **Description**             |
|---------------|-----------------------------|
| **DisplayName** | Profile display name      |
| **Username**    | Profile username          |
| **Bio**         | Profile description       |
| **Avatar**      | Profile Avatar TXID       |
| **Banner**      | Profile Banner TXID       |

Sample output from AO: ```"Data": "{\"Assets\":[],\"Profile\":{\"DisplayName\":\"tom-ao-profile-1\",\"Bio\":\"hello ao\",\"Avatar\":\"LzBub_drZ3xOE2mn_HW5xDNDWJ2pe3zN6NUQkMc3-C0\",\"Banner\":\"hAjf58dmqS-mkRTwPvmVLRZBPC-oZK4H-uDAceZoSPk\",\"Username\":\"tom-ao\"}}"```

## Profile Handlers
| **Handler**           | **Description**                                                                        |
|-----------------------|----------------------------------------------------------------------------------------|
| **Info**              | Dry-runable, returns profile metadata and assets as JSON.                             |
| **Update-Profile**    | Accepts JSON in the data field to update profile metadata.                            |
| **Transfer**          | Allows a profile to transfer some quantity of an asset they own to another profile or address. |
| **Debit-Notice**      | Supports interactions with UCM, decreases asset count if marked for sale.             |
| **Credit-Notice**     | Supports interactions with UCM, decreases asset count if marked for sale.             |
| **Add-Uploaded-Asset**| Allows an AO Atomic Asset to be linked to a profile.  

## Profile Registry Handlers 

| **Handler**                | **Description**                                                                                                      |
|----------------------------|----------------------------------------------------------------------------------------------------------------------|
| **Prepare-Database**       | Prepares the database schema by creating tables `ao_profile_metadata` and `ao_profile_authorization` if they don't exist. |
| **Get-Metadata-By-ProfileIds** | Retrieves metadata for profiles based on the provided profile IDs. Returns metadata as JSON or sends an error message if input data is invalid. |
| **Get-Profiles-By-Address**| Retrieves associated profiles for a given wallet address from `ao_profile_authorization`. Returns profiles as JSON or an error if none are found. |
| **Update-Profile**         | Updates a profile's metadata or adds it if it doesn't exist. Links an authorized address if needed.                  |
| **Read-Metadata**          | (Debug) Prints all rows from the `ao_profile_metadata` table.                                                               |
| **Read-Authorization**     | (Debug) Prints all rows from the `ao_profile_authorization` table.                                                          |

## Creating a Profile process and setting metadata

AO Profile functions by spawning a new personal process for a user if they decide to make one. The wallet that spawns the profile is authorized to make changes to it. Prior to creating a process, you should check if the [wallet address already has any profiles](#by-wallet-address).

Here is an overview of actions that take place to create an AO Profile process and update the metadata:

1. A new process is spawned with the base AO module. ([Sample Code](https://github.com/permaweb/ao-bazar/blob/main/src/components/organisms/ProfileManage/ProfileManage.tsx#L156))
2. A Gateway GraphQL query is executed for the spawned transaction ID in order to find the resulting process ID. ([Sample Code](https://github.com/permaweb/ao-bazar/blob/main/src/components/organisms/ProfileManage/ProfileManage.tsx#L168))
3. The [profile.lua](profile.lua) source code is then loaded from Arweave, and sent to the process as an eval message. This loads the state and handlers into the process. ([Sample Code](https://github.com/permaweb/ao-bazar/blob/6ac0e3df68386535bb497445f6209b985845977b/src/components/organisms/ProfileManage/ProfileManage.tsx#L191))
4. Client collects Profile metadata in the [data object](https://github.com/permaweb/ao-bazar/blob/6ac0e3df68386535bb497445f6209b985845977b/src/components/organisms/ProfileManage/ProfileManage.tsx#L70), and [uploads a banner and cover image](https://github.com/permaweb/ao-bazar/blob/6ac0e3df68386535bb497445f6209b985845977b/src/components/organisms/ProfileManage/ProfileManage.tsx#L77). 
5. Finally, a message is sent to update the Profile metadata. ([Sample Code](https://github.com/permaweb/ao-bazar/blob/6ac0e3df68386535bb497445f6209b985845977b/src/components/organisms/ProfileManage/ProfileManage.tsx#L210)). 

## Fetching Profile metadata
### By Profile ID
If you have the Profile ID already, you can easily read the metadata directly from the Profile process via the `Info` handler. ([Sample Code](https://github.com/permaweb/ao-bazar/blob/6ac0e3df68386535bb497445f6209b985845977b/src/api/profiles.ts#L6))

### By Wallet Address 
If you have a wallet address, you can look up the profile(s) associated with it by interacting with the Profile Registry via the `Get-Profiles-By-Address` handler. ([Sample Code](https://github.com/permaweb/ao-bazar/blob/6ac0e3df68386535bb497445f6209b985845977b/src/api/profiles.ts#L40))

## Profile Registry process

The Profile Registry process collects and aggregates all profile metadata in a single database and its process ID is defined in all AO Profiles. Messages are sent from the Profiles to the Registry when any creations or edits to metadata occur, and can be trusted by the msg.From address which is the Profile ID. 

The overall process looks like:
1. A message is sent with an action of `Update-Profile` to the Profile process with the information that the creator provided. 
2. Once the Profile metadata is updated internally in the Profile Process, a new message is then sent to the Registry process to add or update the corresponding profile accordingly via its own `Update-Profile` handler. 

# Atomic assets

## Overview

Atomic assets are unique digital items stored on Arweave. Unlike traditional NFTs, the asset data is uploaded together with a smart contract in a single transaction which is inseparable and does not rely on external components.

## How it works
AO atomic assets follow the token spec designed for exchangeable tokens which can be found [here](https://ao.arweave.dev/#/). The creation of an atomic asset happens with these steps:

1. The [asset process handlers](https://arweave.net/y9VgAlhHThl-ZiXvzkDzwC5DEjfPegD6VAotpP3WRbs) are fetched from Arweave
2. Asset fields are replaced with the values submitted by the user
3. A new process is spawned, with the tags and asset data included
4. A message is sent to the newly created process with an action of 'Eval', which includes the process handlers
5. A message is sent to the profile that created the asset in order to add the new asset to its Assets table

# Collections

## Overview
[AO Collections](collection.lua) are designed to allow users to group atomic assets together.

## How it works
The creation of a collection happens with these steps:

1. The [collection process handlers](https://arweave.net/e15eooIt86VjB1IDRjOMedwmtmicGtKkNWSnz8GyV4k) are fetched from Arweave.
2. Collection fields are replaced with the values submitted by the user.
3. A new process is spawned, with the collection tags.
4. A message is sent to the newly created process with an action of 'Eval', which includes the process handlers.
5. A message is sent to a collection registry which contains information on all created collections.