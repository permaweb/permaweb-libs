# @permaweb/libs

This SDK provides a set of libraries designed as foundational building blocks for developers to create and interact with applications on Arweave"s permaweb. These libraries aim to contribute building on the composable web, promoting interoperability and reusability across decentralized applications. With libraries for managing profiles, atomic assets, collections, and more, this SDK simplifies the development of decentralized, permanent applications.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Initialization](#initialization)
- [Usage](#usage)
  - [Zones](#zones)
    - [createZone](#createzone)
    - [updateZone](#updatezone)
    - [getZone](#getzone)
  - [Profiles](#profiles)
    - [createProfile](#createprofile)
    - [updateProfile](#updateprofile)
    - [getProfileById](#getprofilebyid)
    - [getProfileByWalletAddress](#getprofilebywalletaddress)
  - [Atomic Assets](#atomic-assets)
    - [createAtomicAsset](#createatomicasset)
    - [getAtomicAsset](#getatomicasset)
    - [getAtomicAssets](#getatomicassets)
  - [Comments](#comments)
    - [createComment](#createcomment)
    - [getComment](#getcomment)
    - [getComments](#getcomments)
  - [Collections](#collections)
    - [createCollection](#createcollection)
    - [updateCollectionAssets](#updatecollectionassets)
    - [getCollection](#getcollection)
    - [getCollections](#getcollections)
- [Examples](#examples)
- [Resources](#resources)

## Prerequisites

- `node >= v18.0`
- `npm` or `yarn`
- `arweave`
- `@permaweb/aoconnect`

## Installation

If `arweave` or `@permaweb/aoconnect` is not already installed, add them to the installation command below as additional packages

```bash
npm install @permaweb/libs
```

or

```bash
yarn add @permaweb/libs
```

## Initialization

```typescript
import Arweave from "arweave";
import { connect, createDataItemSigner } from "@permaweb/aoconnect";
import Permaweb from "@permaweb/libs";

// Browser Usage
const wallet = window.arweaveWallet;

// NodeJS Usage
const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET, "utf-8"));

const permaweb = Permaweb.init({
  ao: connect(),
  arweave: Arweave.init(),
  signer: createDataItemSigner(wallet),
});
```

## Usage

### Zones

Zones are representations of entities on the permaweb that contain relevant information and can perform actions on the entity"s behalf. A profile is an instance of a zone with specific metadata ([Read the spec](./specs/spec-zones.md)).

#### `createZone`

```typescript
const zoneId = await permaweb.createZone();
```

<details>
  <summary><strong>Parameters</strong></summary>

- `tags (optional)`: Additional tags

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
ZoneProcessId;
```

</details>

#### `updateZone`

```typescript
const zoneUpdateId = await permaweb.updateZone(
  {
    name: "Sample Zone",
    metadata: {
      description: "A sample zone for testing",
      version: "1.0.0",
    },
  },
  zoneId
);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Zone data to update, specified in an object
- `zoneId`: The ID of the zone to update

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
ZoneUpdateId;
```

</details>

#### `getZone`

```typescript
const zone = await permaweb.getZone(zoneId);
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

### Profiles

Profiles are a digital representation of entities, such as users, organizations, or channels. They instantiate zones with specific metadata that describes the entity and can be associated with various digital assets and collections. Profiles are created, updated, and fetched using the following functions.

#### `createProfile`

```typescript
const profileId = await permaweb.createProfile({
  username: "My username",
  displayName: "My display name",
  description: "My description",
  thumbnail: "Thumbnail image data",
  banner: "Banner image data",
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing profile details, including `username`, `displayName`, `description`, `thumbnail (optional)`, and `banner (optional)`
- `callback (optional)`: Callback function for client use

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
ProfileProcessId;
```

</details>

#### `updateProfile`

```typescript
const profileId = await permaweb.updateProfile(
  {
    username: "My usename",
    displayName: "My display name",
    description: "My description",
    thumbnail: "Thumbnail image data",
    banner: "Banner image data",
  },
  profileId
);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Profile details to update, structured similarly to `createProfile`
- `profileId`: The ID of the profile to update
- `callback (optional)`: Callback function for client use

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
ProfileProcessUpdateId;
```

</details>

#### `getProfileById`

```typescript
const profile = await permaweb.getProfileById(profileId);
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

```typescript
const profile = await permaweb.getProfileByWalletAddress(walletAddress);
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

### Atomic Assets

Atomic assets are unique digital item consisting of an AO process and its associated data which are stored together in a single transaction on Arweave ([Read the spec](./specs/spec-atomic-assets.md)).

#### `createAtomicAsset`

```typescript
const assetId = await permaweb.createAtomicAsset({
  name: "Example Name",
  description: "Example Description",
  topics: ["Topic 1", "Topic 2", "Topic 3"],
  creator: CREATOR_ADDRESS,
  data: "1234",
  contentType: "text/plain",
  assetType: "Example Atomic Asset Type",
  metadata: {
    status: "Initial Status",
  },
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing asset details, including `name`, `description`, ` topics`, `creator (wallet or profile address)`, `data`, `contentType`, `assetType`, `metadata (optional)`, and `tags (optional)`
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

```typescript
const asset = await permaweb.getAtomicAsset(assetId);
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
  ticker: "ATOMIC",
  metadata: { status: "Initial Status" },
  creator: "CREATOR_ADDRESS",
  denomination: "1",
  name: "Example Name",
  lastUpdate: "nil",
  transferable: "true",
  dateCreated: "1737827430138",
  balances: { CREATOR_ADDRESS: "1" }
}
```

</details>

#### `getAtomicAssets`

```typescript
const assets = await permaweb.getAtomicAssets(assetIds);
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

### Comments

Comments are an instantiation of atomic assets created with additional tags to link them with other comments / atomic assets with specific data or root contexts.

#### `createComment`

```typescript
const commentId = await permaweb.createComment({
  content: "Sample comment on an atomic asset",
  creator: profileId,
  parentId: atomicAssetId,
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing `content`, `creator`, `parentId`, and `rootId (optional)`
- `callback (optional)`: Callback function for status updates.

</details>

<details>
  <summary>
    <strong>Response</strong>
  </summary>

```typescript
CommentProcessId;
```

</details>

#### `getComment`

```typescript
const comment = await permaweb.getComment(commentId);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `commentId`: The ID of the comment to fetch.

</details>

<details>
  <summary>
    <strong>Response</strong>
  </summary>

```typescript
{
  id: "CommentProcessId",
  title: "Comment Title",
  description: "Comment Description",
  parentId: "ParentProcessId",
  rootId: "RootProcessId",
  content: "My Comment",
  contentType: "text/plain",
  creator: "Creator Identifier",
  collectionId: "Collection Identifier",
  transferable: true,
  tags: [
    { name: "Data-Source", value: "Data Source Identifier" },
    { name: "Root-Source", value: "Root Source Identifier" }
  ]
}
```

</details>

#### `getComments`

```typescript
const comments = await permaweb.getComments({
  parentId: atomicAssetId,
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing `parentId` or `rootId`

</details>

<details>
  <summary>
    <strong>Response</strong>
  </summary>

```typescript
[
  {
    id: "CommentProcessId1",
    title: "Comment Title 1",
    description: "Comment Description 1",
    parentId: "ParentProcessId",
    rootId: "RootProcessId",
    content: "My Comment",
    contentType: "text/plain",
    creator: "Creator Identifier",
    collectionId: "Collection Identifier",
    transferable: true,
    tags: [
      { name: "Data-Source", value: "Data Source Identifier" },
      { name: "Root-Source", value: "Root Source Identifier" },
    ],
  },
  {
    id: "CommentProcessId2",
    title: "Comment Title 2",
    description: "Comment Description 2",
    parentId: "ParentProcessId",
    rootId: "RootProcessId",
    content: "My Comment",
    contentType: "text/plain",
    data: "Comment data 2",
    creator: "Creator Identifier",
    collectionId: "Collection Identifier",
    transferable: true,
    tags: [
      { name: "Data-Source", value: "Data Source Identifier" },
      { name: "Root-Source", value: "Root Source Identifier" },
    ],
  },
];
```

</details>

### Collections

Collections are structured groups of atomic assets, allowing for cohesive representation, management, and categorization of digital items. Collections extend the concept of atomic assets by introducing an organized layer to group and manage related assets. ([Read the spec](./specs/spec-collections.md)).

#### `createCollection`

```typescript
const collectionId = await permaweb.createCollection({
  title: "Example Title",
  description: "Example Description",
  creator: profileId,
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing `title`, `description`, `creator`, `thumbnail (optional)`, and `banner (optional)`

</details>

<details>
  <summary>
    <strong>Response</strong>
  </summary>

```typescript
CollectionProcessId;
```

</details>

#### `updateCollectionAssets`

```typescript
const collectionUpdateId = await permaweb.updateCollectionAssets({
  collectionId: collectionId,
  assetIds: ["AssetId1", "AssetId2", "AssetId3"],
  creator: creator,
  updateType: "Add",
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing `collectionId`, `assetIds`, `profileId`, and `updateType ("Add" | "Remove")`

</details>

<details>
  <summary>
    <strong>Response</strong>
  </summary>

```typescript
CollectionProcessUpdateId;
```

</details>

#### `getCollection`

```typescript
const collection = await permaweb.getCollection(collectionId);
```

<details>
  <summary><strong>Parameters</strong></summary>

- `collectionId`: The ID of the collection to fetch

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
{
  id: "Id",
  title: "Title",
  description: "Description",
  creator: "Creator",
  dateCreated: "DateCreated",
  thumbnail: "ThumbnailTx",
  banner: "BannerTx",
  assets: ["AssetId1", "AssetId2", "AssetId3"]
}
```

</details>

#### `getCollections`

```typescript
const collections = await permaweb.getCollections();
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing `creator (optional)`

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
[
  {
    id: "Id",
    title: "Title",
    description: "Description",
    creator: "Creator",
    dateCreated: "DateCreated",
    thumbnail: "ThumbnailTx",
    banner: "BannerTx",
    assets: ["AssetId1", "AssetId2", "AssetId3"],
  },
  {
    id: "Id",
    title: "Title",
    description: "Description",
    creator: "Creator",
    dateCreated: "DateCreated",
    thumbnail: "ThumbnailTx",
    banner: "BannerTx",
    assets: ["AssetId1", "AssetId2", "AssetId3"],
  },
];
```

</details>

## Examples

To streamline the integration of `@permaweb/libs` into your React applications, you can use the following `PermawebProvider`. This provider simplifies dependency management and avoids the need to create multiple SDK instances across different components in your frontend application. By leveraging React Context, the provider ensures the Permaweb SDK is initialized once and is accessible throughout your component tree.

### Key Features of This Example:

- **Global Initialization**: The `PermawebProvider` initializes the necessary dependencies (e.g., Arweave, AO Connect, and optional wallet signing).
- **React Context Integration**: It makes the initialized `libs` instance globally available to all child components without requiring prop drilling.
- **Reusable Hook**: The `usePermawebProvider` hook offers a convenient way to access the SDK in any component.

---

### Provider Setup

The following example demonstrates how to create a React Context and Provider for `@permaweb/libs`.

```typescript
import React from "react";
import Arweave from "arweave";
import { connect, createDataItemSigner } from "@permaweb/aoconnect";
import Permaweb from "@permaweb/libs";

// Define the context shape
interface PermawebContextState {
  libs: Permaweb | null;
}

// Create a React context for Permaweb
const PermawebContext = React.createContext<PermawebContextState>({
  libs: null,
});

// Hook to access the Permaweb context
export function usePermawebProvider(): PermawebContextState {
  return React.useContext(PermawebContext);
}

// Provider component for initializing and sharing the Permaweb instance
export function PermawebProvider(props: { children: React.ReactNode }) {
  const [libs, setLibs] = React.useState<Permaweb | null>(null);

  React.useEffect(() => {
    // Initialize dependencies
    const dependencies: any = { ao: connect(), arweave: Arweave.init() };
    if (wallet) {
      dependencies.signer = createDataItemSigner(wallet);
    }

    // Initialize Permaweb SDK and set it in the state
    const permawebInstance = Permaweb.init(dependencies);
    setLibs(permawebInstance);
  }, []);

  return (
    <PermawebContext.Provider value={{ libs }}>
      {props.children}
    </PermawebContext.Provider>
  );
}
```

### Explanation:

1. **React Context**: The `PermawebContext` is used to store the initialized `libs` object, making it accessible across your application.
2. **Dynamic Initialization**: In the `useEffect` hook, the dependencies are initialized once when the provider mounts, including optional wallet signing logic.
3. **Encapsulation**: The `PermawebProvider` ensures the SDK logic is abstracted, keeping the rest of your app clean and focused.

---

### Usage in a Component

Here's how you can use the `usePermawebProvider` hook to access the `libs` instance in a React component:

```typescript
import React from "react";
import { usePermawebProvider } from "providers/PermawebProvider";

export default function MyComponent() {
  const { libs } = usePermawebProvider();

  React.useEffect(() => {
    (async function fetchAsset() {
      if (libs) {
        try {
          const asset = await libs.getAtomicAsset(id);
          console.log("Fetched Asset:", asset);
        } catch (error) {
          console.error("Error fetching asset:", error);
        }
      }
    })();
  }, [libs]);

  return <h1>Permaweb Libs Component</h1>;
}
```

## Resources

- [AO Connect](https://github.com/permaweb/ao)
- [ArweaveJS](https://github.com/ArweaveTeam/arweave-js)
