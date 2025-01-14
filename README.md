# @permaweb/libs

This SDK provides a set of libraries designed as foundational building blocks for developers to create and interact with applications on Arweave's permaweb. These libraries aim to contribute building on the composable web, promoting interoperability and reusability across decentralized applications. With libraries for managing profiles, atomic assets, collections, and more, this SDK simplifies the development of decentralized, permanent applications.

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

Zones are representations of entities on the permaweb that contain relevant information and can perform actions on the entity's behalf. A profile is an instance of a zone with specific metadata ([Read the spec](./specs/spec-zones.md)).

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
  username: "Sample Zone",
  displayName: "Sample Zone",
  description: "Sample description",
  thumbnail: "Thumbnail image data",
  banner: "Banner image data",
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing profile details, including `username`, `displayName`, `description`, `thumbnail`, and `banner`
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
    username: "Sample Zone",
    displayName: "Sample Zone",
    description: "Sample description",
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
    title: 'Example Title',
    description, 'Example Description',
    type: 'Example Atomic Asset Type',
    topics: ['Topic 1', 'Topic 2', 'Topic 3'],
    contentType: 'text/html',
    data: '1234'
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing profile details, including `title`, `description`, `type`, `topics`, `contentType`, and `data`
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
  id: 'CommentProcessId',
  title: 'Comment Title',
  description: 'Comment Description',
  dataSource: 'Data Source Identifier',
  rootSource: 'Root Source Identifier',
  contentType: 'text/plain',
  data: 'Comment data',
  creator: 'Creator Identifier',
  collectionId: 'Collection Identifier',
  transferable: true,
  tags: [
    { name: 'Data-Source', value: 'Data Source Identifier' },
    { name: 'Root-Source', value: 'Root Source Identifier' }
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
    dataSource: "Data Source Identifier",
    rootSource: "Root Source Identifier",
    contentType: "text/plain",
    data: "Comment data 1",
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
    dataSource: "Data Source Identifier",
    rootSource: "Root Source Identifier",
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
const commentId = await permaweb.createCollection({
  title: "Sample collection title",
  description: "Sample collection description",
  creator: profileId,
  thumbnail: "Thumbnail image data",
  banner: "Banner image data",
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
const commentId = await permaweb.updateCollectionAssets({
  collectionId: collectionId,
  assetIds: ["AssetId1", "AssetId2", "AssetId3"],
  profileId: profileId,
  updateType: "Add",
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing `collectionId`, `assetIds`, `profileId`, and `updateType ('Add' | 'Remove')`

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
  id: 'Id',
  title: 'Title',
  description: 'Description',
  creator: 'Creator',
  dateCreated: 'DateCreated',
  thumbnail: 'ThumbnailTx',
  banner: 'BannerTx',
  assets: ['AssetId1', 'AssetId2', 'AssetId3']
}
```

</details>

#### `getCollections`

```typescript
const collections = await permaweb.getCollections(collectionId);
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

To avoid the need for creating many instances in your frontend application, this react provider can be used as a reference.

#### Provider

```typescript
import Arweave from "arweave";
import { connect, createDataItemSigner } from "@permaweb/aoconnect";
import Permaweb from "@permaweb/libs";

const PermawebContext = React.createContext<PermawebContextState>({
  libs: null,
});

export function usePermawebProvider(): PermawebContextState {
  return React.useContext(PermawebContext);
}

export function PermawebProvider(props: { children }) {
  const [libs, setLibs] = React.useState(null);

  React.useEffect(() => {
    let dependencies = { ao: connect(), arweave: Arweave.init() };
    if (wallet) dependencies.signer = createDataItemSigner(wallet);

    setLibs(Permaweb.init(deps));
  }, [wallet]);
}

return (
  <PermawebContext.Provider value={{ libs: libs }}>
    {props.children}
  </PermawebContext.Provider>
);
```

#### Usage in a component

```typescript
import { usePermawebProvider } from "providers/PermawebProvider";

export default function MyComponent() {
  const permawebProvider = usePermawebProvider();

  React.useEffect(() => {
    (async function () {
      const asset = await permawebProvider.libs.getAtomicAsset(id);
    })();
  }, [permawebProvider.libs]);

  return <h1>Permaweb Libs Component</h1>;
}
```

## Resources

- [AO Connect](https://github.com/permaweb/ao)
- [ArweaveJS](https://github.com/ArweaveTeam/arweave-js)