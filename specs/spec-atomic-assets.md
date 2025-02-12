# Atomic Assets

**Status:** Draft  
**Version:** 0.0.1  
**Authors:** Nick Juliano (nick@arweave.org)

## Introduction

This document specifies **Atomic Assets** in the AO / Arweave ecosystem. An Atomic Asset is a unique, self-contained digital item that consists of an AO process and its associated data stored together in a single Arweave transaction. These assets are designed to be **ownable** and **transferable**, adhering to the [AO Token Blueprint](https://cookbook_ao.arweave.net/guides/aos/blueprints/token.html). Atomic Assets include additional data and metadata to represent a wide range of digital items, such as art, music, videos, domain names, applications, and more.

## Motivation

Atomic Assets serve as foundational building blocks for the permaweb, providing a standardized way to represent digital ownership and facilitate seamless interoperability across decentralized applications. The need for Atomic Assets arises from the following key motivations:

1. **Unique Representation**:  
   Atomic Assets uniquely represent digital items, ensuring authenticity and enabling ownership tracking across the permaweb.

2. **Tokenization of Digital Assets**:  
   By adhering to the AO Token Blueprint, Atomic Assets simplify the creation, transfer, and management of tokenized items, enabling efficient trade and integration with marketplaces.

3. **Extensibility**:  
   Including metadata and additional data allows Atomic Assets to be extended for use cases beyond basic token functionality, such as embedding application logic or representing complex digital goods.

4. **Interoperability**:  
   Atomic Assets provide a consistent standard that ensures compatibility across diverse platforms and applications within the AO ecosystem.

## Specification

An Atomic Asset consists of the following components:

### 1. **AO Token Process**

- Atomic Assets are defined as AO processes adhering to the [AO Token Blueprint](https://cookbook_ao.arweave.net/guides/aos/blueprints/token.html).
- This ensures compliance with standards for token creation, transfer, and ownership management.

### 2. **Metadata**

- Metadata describes the asset and follows the [ANS-110 Standard](https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-110.md).
- Required metadata includes:
  - **Name**: The asset's name.
  - **Ticker**: A unique identifier for the asset.
  - **Denomination**: The smallest divisible unit of the asset.
  - **Creator**: The asset's creator.
  - **Collection**: (Optional) The Collection ID if the asset belongs to a group.

### 4. **Transferability**

- Assets may optionally be non-transferable, in which case only the creator or AO system can modify their state.

### 5. **Data**

- Atomic Assets include the actual data they represent (e.g., digital artwork, application code, or metadata) within their transaction.

## Use Cases

1. **Digital Art**:  
   Represent and trade unique pieces of digital artwork with embedded metadata.

2. **Tokenized Applications**:  
   Create tokens tied to software or application processes.

3. **Memberships**:  
   Use Atomic Assets as non-transferable membership tokens with specific privileges.

4. **Domain Names**:  
   Tokenize and manage ownership of decentralized domain names.

## Conclusion

By combining metadata, tokenization, and state management, Atomic Assets provide a comprehensive framework for representing and managing digital items in the AO / Arweave ecosystem. This specification ensures a scalable and interoperable foundation for developers and users alike.
