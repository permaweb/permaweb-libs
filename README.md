# @permaweb/libs

This SDK provides a set of libraries designed as foundational building blocks for developers to create and interact with applications on Arweave's permaweb. These libraries aim to contribute building on the composable web, promoting interoperability and reusability across decentralized applications. With modules for managing zones, profiles, atomic assets, and more, this SDK simplifies the development of decentralized, permanent applications.

## Prerequisites

- `node >= v18.0`
- `npm` or `yarn`

## Installation

```bash
npm install @permaweb/libs
```

or

```bash
yarn add @permaweb/libs
```

## Profiles

Profiles are a digital representation of entities, such as users, organizations, or channels. They instantiate zones with specific metadata that describes the entity and can be associated with various digital assets and collections. Profiles are created, updated, and fetched using the following functions.

### `createProfile`

Creates a profile, initializing a zone with specific profile relevant metadata.

```typescript
import { createProfile } from "@permaweb/libs";

const profileId = await createProfile(
  {
    username: "Sample Zone",
    displayName: "Sample Zone",
    description: "Sample description",
    thumbnail: "Thumbnail image data",
    banner: "Banner image data",
  },
  wallet
);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing profile details, including `username`, `displayName`, `description`, `thumbnail`, and `banner`.
- `wallet`: Wallet object
- `callback (optional)`: Callback function for client use

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
string | null; // Profile ID or null if creation fails
```

</details>

### `updateProfile`

Updates a profile by modifying its metadata, such as `username`, `displayName`, `description`, and optional image fields like `thumbnail` and `banner`.

```typescript
import { updateProfile } from "@permaweb/libs";

const profileId = await updateProfile(
  {
    username: "Sample Zone",
    displayName: "Sample Zone",
    description: "Sample description",
    thumbnail: "Thumbnail image data",
    banner: "Banner image data",
  },
  profileId,
  wallet
);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Profile details to update, structured similarly to `createProfile`.
- `profileId`: The ID of the profile to update.
- `wallet`: Wallet object for transaction signing.
- `callback (optional)`: Function to log status during the update process.

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
string | null; // Profile update ID or null if update fails
```

</details>

### `getProfileById`

Fetches a profile based on its ID. Returns a structured profile object containing the profile’s metadata, assets, and other properties associated with the profile.

```typescript
import { getProfileById } from "@permaweb/libs";

const profile = await getProfileById(profileId);
```

<details>
  <summary><strong>Arguments</strong></summary>

- `profileId`: The ID of the profile to fetch.

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
{
  id: ProfileID;
  walletAddress: WalletAddress;
  username: string;
  displayName: string;
  description: string;
  thumbnail?: string;
  banner?: string;
  assets?: object;
  [key: string]: any;
}
```

</details>

### `getProfileByWalletAddress`

Fetches a profile using the wallet address associated with it. This function is useful for retrieving a profile when only the wallet address is known.

```typescript
import { getProfileByWalletAddress } from "@permaweb/libs";

const profile = await getProfileByWalletAddress(walletAddress);
```

<details>
  <summary><strong>Arguments</strong></summary>

- `walletAddress`: The wallet address associated with the profile.

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
ProfileType | null;
```

</details>

## Zones

Zones are representations of entities on the permaweb that contain relevant information and can perform actions on the entity's behalf. A profile is an instance of a zone with specific metadata.

### `createZone`

Creates a zone, setting up a key-value store and asset manager to track tokens created or transferred.

```typescript
import { createZone } from "@permaweb/libs";

const zoneId = await createZone(wallet);
```

<details>
  <summary><strong>Response</strong></summary>

```typescript
ZoneProcessId;
```

</details>

### `updateZone`

Updates a zone's key-value store with specified data.

```typescript
import { updateZone } from "@permaweb/libs";

const zoneUpdateId = await updateZone(
  {
    zoneId: zoneId,
    data: {
      name: "Sample Zone",
      metadata: {
        description: "A test zone for unit testing",
        version: "1.0.0",
      },
    },
  },
  wallet
);
```

<details>
  <summary><strong>Response</strong></summary>

```typescript
ZoneUpdateId;
```

</details>

### `getZone`

Fetches a zone based on its ID, including store data and any associated assets.

```typescript
import { getZone } from "@permaweb/libs";

const zone = await getZone(zoneId);
```

<details>
  <summary><strong>Response</strong></summary>

```typescript
{ store: [], assets: [] };
```

</details>
