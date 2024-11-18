# @permaweb/libs

This SDK provides a set of libraries designed as foundational building blocks for developers to create and interact with applications on Arweave's permaweb. These libraries aim to contribute building on the composable web, promoting interoperability and reusability across decentralized applications. With libraries for managing profiles, atomic assets, collections, and more, this SDK simplifies the development of decentralized, permanent applications.

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

## Zones

Zones are representations of entities on the permaweb that contain relevant information and can perform actions on the entity's behalf. A profile is an instance of a zone with specific metadata.

#### `createZone`

Creates a zone, setting up a key-value store and asset manager to track tokens created or transferred.

```typescript
import { createZone } from "@permaweb/libs";

const zoneId = await createZone(wallet);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `wallet`: Wallet object

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
ZoneProcessId;
```

</details>

#### `updateZone`

Updates a zone's key-value store with specified data.

```typescript
import { updateZone } from "@permaweb/libs";

const zoneUpdateId = await updateZone(
  {
    name: "Sample Zone",
    metadata: {
      description: "A test zone for unit testing",
      version: "1.0.0",
    },
  },
  zoneId,
  wallet
);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Zone data to update, specified in an object
- `zoneId`: The ID of the zone to update
- `wallet`: Wallet object

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
ZoneUpdateId;
```

</details>

#### `getZone`

Fetches a zone based on its ID, including store data and any associated assets.

```typescript
import { getZone } from "@permaweb/libs";

const zone = await getZone(zoneId);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `zoneId`: The ID of the zone to fetch

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
{ store: [], assets: [] };
```

</details>

## Profiles

Profiles are a digital representation of entities, such as users, organizations, or channels. They instantiate zones with specific metadata that describes the entity and can be associated with various digital assets and collections. Profiles are created, updated, and fetched using the following functions.

#### `createProfile`

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

- `args`: Object containing profile details, including `username`, `displayName`, `description`, `thumbnail`, and `banner`
- `wallet`: Wallet object
- `callback (optional)`: Callback function for client use

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
string | null; // Profile ID or null if creation fails
```

</details>

#### `updateProfile`

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

- `args`: Profile details to update, structured similarly to `createProfile`
- `profileId`: The ID of the profile to update
- `wallet`: Wallet object
- `callback (optional)`: Callback function for client use

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
string | null; // Profile update ID or null if update fails
```

</details>

#### `getProfileById`

Fetches a profile based on its ID. Returns a structured profile object containing the profile’s metadata, assets, and other properties associated with the profile.

```typescript
import { getProfileById } from "@permaweb/libs";

const profile = await getProfileById(profileId);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `profileId`: The ID of the profile to fetch

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
{
  id: "ProfileProcessId",
  walletAddress: "WalletAddress",
  username: "Sample username",
  displayName: "Sample display name",
  description: "Sample description",
  thumbnail: "ThumbnailTxId",
  banner: "BannerTxId",
  assets: [
    { id: "AssetProcessId1", quantity: "1", dateCreated: 123456789, lastUpdate: 123456789 },
    { id: "AssetProcessId2", quantity: "1", dateCreated: 123456789, lastUpdate: 123456789 },
    { id: "AssetProcessId3", quantity: "1", dateCreated: 123456789, lastUpdate: 123456789 },
  ]
}
```

</details>

#### `getProfileByWalletAddress`

Fetches a profile using the wallet address associated with it. This function is useful for retrieving a profile when only the wallet address is known.

```typescript
import { getProfileByWalletAddress } from "@permaweb/libs";

const profile = await getProfileByWalletAddress(walletAddress);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `walletAddress`: The wallet address associated with the profile

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
{
  id: "ProfileProcessId",
  walletAddress: "WalletAddress",
  username: "Sample username",
  displayName: "Sample display name",
  description: "Sample description",
  thumbnail: "ThumbnailTxId",
  banner: "BannerTxId",
  assets: [
    { id: "AssetProcessId1", quantity: "1", dateCreated: 123456789, lastUpdate: 123456789 },
    { id: "AssetProcessId2", quantity: "1", dateCreated: 123456789, lastUpdate: 123456789 },
    { id: "AssetProcessId3", quantity: "1", dateCreated: 123456789, lastUpdate: 123456789 },
  ]
}
```

</details>

## Atomic Assets

Atomic assets are unique digital item consisting of an AO process and its associated data which are stored together in a single transaction on Arweave.

#### `createAtomicAsset`

Creates an atomic asset.

```typescript
import { createAtomicAsset } from '@permaweb/libs';

const assetId = await createAtomicAsset({
    title: 'Example Title',
    description, 'Example Description',
    type: 'Example Atomic Asset Type',
    topics: ['Topic 1', 'Topic 2', 'Topic 3'],
    contentType: 'text/html',
    data: '1234'
}, wallet);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing profile details, including `title`, `description`, `type`, `topics`, `contentType`, and `data`
- `wallet`: Wallet object
- `callback (optional)`: Callback function for client use

</details>

<details>
  <summary>
    <strong>Response</strong>
  </summary>

```typescript
AssetProcessId;
```

</details>

#### `getAtomicAsset`

Performs a lookup of an atomic asset by ID. This function also performs a dryrun on the asset process to receive the balances and other associated metadata of the atomic asset that is inside the AO process itself.

```typescript
import { getAtomicAsset } from "@permaweb/libs";

const asset = await getAtomicAsset(assetId);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `assetId`: The ID of the asset to fetch

</details>

<details>
  <summary>
    <strong>Response</strong>
  </summary>

```typescript
 {
  id: 'z0f2O9Fs3yb_EMXtPPwKeb2O0WueIG5r7JLs5UxsA4I',
  title: 'City',
  description: 'A collection of AI generated images of different settings and areas',
  type: null,
  topics: null,
  contentType: 'image/png',
  renderWith: null,
  thumbnail: null,
  udl: {
    access: { value: 'One-Time-0.1' },
    derivations: { value: 'Allowed-With-One-Time-Fee-0.1' },
    commercialUse: { value: 'Allowed-With-One-Time-Fee-0.1' },
    dataModelTraining: { value: 'Disallowed' },
    paymentMode: 'Single',
    paymentAddress: 'uf_FqRvLqjnFMc8ZzGkF4qWKuNmUIQcYP0tPlCGORQk',
    currency: 'xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10'
  },
  creator: 'SaXnsUgxJLkJRghWQOUs9-wB0npVviewTkUbh2Yk64M',
  collectionId: 'XcfPzHzxt2H8FC03MAC_78U1YwO9Gdk72spbq70NuNc',
  implementation: 'ANS-110',
  dateCreated: 1717663091000,
  blockHeight: 1439467,
  ticker: 'ATOMIC',
  denomination: '1',
  balances: {
    'SaXnsUgxJLkJRghWQOUs9-wB0npVviewTkUbh2Yk64M': '1',
    cfQOZc7saMMizHtBKkBoF_QuH5ri0Bmb5KSf_kxQsZE: '1',
    U3TjJAZWJjlWBB4KAXSHKzuky81jtyh0zqH8rUL4Wd0: '98'
  },
  transferable: true,
  tags: [{ name: 'Remaining', value: 'Tag' }]
}
```

</details>

#### `getAtomicAssets`

Queries multiple atomic assets from the gateway.

```typescript
import { getAtomicAssets } from "@permaweb/libs";

const assets = await getAtomicAssets(assetIds);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `assetIds`: A list of the asset IDs to fetch

</details>

<details>
  <summary>
    <strong>Response</strong>
  </summary>

```typescript
[
  {
    id: "AssetProcessId1",
    title: "City",
    description:
      "A collection of AI generated images of different settings and areas",
    type: null,
    topics: null,
    contentType: "image/png",
    renderWith: null,
    thumbnail: null,
    udl: {
      access: { value: "One-Time-0.1" },
      derivations: { value: "Allowed-With-One-Time-Fee-0.1" },
      commercialUse: { value: "Allowed-With-One-Time-Fee-0.1" },
      dataModelTraining: { value: "Disallowed" },
      paymentMode: "Single",
      paymentAddress: "uf_FqRvLqjnFMc8ZzGkF4qWKuNmUIQcYP0tPlCGORQk",
      currency: "xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10",
    },
    creator: "SaXnsUgxJLkJRghWQOUs9-wB0npVviewTkUbh2Yk64M",
    collectionId: "XcfPzHzxt2H8FC03MAC_78U1YwO9Gdk72spbq70NuNc",
    implementation: "ANS-110",
    dateCreated: 1717663091000,
    blockHeight: 1439467,
    tags: [{ name: "Remaining", value: "Tag" }],
  },
  {
    id: "AssetProcessId2",
    title: "City",
    description:
      "A collection of AI generated images of different settings and areas",
    type: null,
    topics: null,
    contentType: "image/png",
    renderWith: null,
    thumbnail: null,
    udl: {
      access: { value: "One-Time-0.1" },
      derivations: { value: "Allowed-With-One-Time-Fee-0.1" },
      commercialUse: { value: "Allowed-With-One-Time-Fee-0.1" },
      dataModelTraining: { value: "Disallowed" },
      paymentMode: "Single",
      paymentAddress: "uf_FqRvLqjnFMc8ZzGkF4qWKuNmUIQcYP0tPlCGORQk",
      currency: "xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10",
    },
    creator: "SaXnsUgxJLkJRghWQOUs9-wB0npVviewTkUbh2Yk64M",
    collectionId: "XcfPzHzxt2H8FC03MAC_78U1YwO9Gdk72spbq70NuNc",
    implementation: "ANS-110",
    dateCreated: 1717663091000,
    blockHeight: 1439467,
    tags: [{ name: "Remaining", value: "Tag" }],
  },
];
```

</details>