# Zones

**Status:** Draft

**Version:** 0.0.1

**Authors:** Nick Juliano (nick@arweave.org)

## Introduction

This document specifies zones on AO / Arweave. A zone, or personal process, is a representation of an entity which contains information relevant to that entity and can carry out actions on that entity's behalf.

# Profiles

**Status:** Draft

**Version:** 0.0.1

**Authors:** Nick Juliano (nick@arweave.org)

## Introduction

This document specifies profiles on AO / Arweave. A profile is a digital representation of an entity (user, organization, or project) consisting of an AO process and its associated data which are stored together in a single transaction on Arweave. Profiles contain information about the entity and can be associated with various digital assets and collections.

## Motivation

As profiles serve as a foundational building block for identity and representation on the permaweb, a clear specification is required to ensure consistency and interoperability across different implementations. Profiles provide a standardized way to represent entities, their information, and associated assets, which can include personal details, associated links, owned assets, and created collections.

## Specification

A profile must consist of the following components:

1. An AO process which manages the profile data and operations
2. Core profile data:
   - UserName
   - DisplayName
   - Description
   - Thumbnail
   - Banner

3. Associated data:
   - Assets: An array of owned assets, each containing { Id, Type, Quantity }
   - Collections: An array of curated collections, each containing { Id, Name, Items, SortOrder }

4. Roles: An array of roles for managing profile permissions

5. Handlers for various profile operations:
   - Update-Profile: For updating core profile data
   - Add-Uploaded-Asset: For adding new assets to the profile
   - Add-Collection: For creating new collections
   - Update-Collection-Sort: For reordering collections
   - Transfer: For transferring assets
   - Credit-Notice and Debit-Notice: For managing asset balances

The profile should follow the AO process model and interact with other AO processes, such as a registry for broader ecosystem integration.

# Atomic assets

**Status:** Draft

**Version:** 0.0.1

**Authors:** Nick Juliano (nick@arweave.org)

## Introduction

This document specifies atomic assets on AO / Arweave. An atomic asset is a unique digital item consisting of an AO process and its associated data which are stored together in a single transaction on Arweave. Atomic assets are ownable and transferable tokens which follow the [AO Token Blueprint](https://cookbook_ao.arweave.net/guides/aos/blueprints/token.html), while also including additional data and metadata that can be used to represent a wide variety of digital assets.

## Motivation

As atomic assets serve as a foundational building block for the permaweb, a clear specification is required to ensure consistency and interoperability across different implementations. Atomic assets provide a standardized way to represent ownable and tradeable items which can art, music, videos, applications, domains names, and more.

## Specification

An atomic asset must consist of the following components:

- An AO process which follows the [AO Token Blueprint](https://cookbook_ao.arweave.net/guides/aos/blueprints/token.html)
- Metadata to describe the asset which follows the [ANS-110 Standard](https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-110.md)
- Data which represents the asset itself

# Collections