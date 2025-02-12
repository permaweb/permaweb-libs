# Comments

**Status:** Draft  
**Version:** 0.0.1  
**Authors:** Nick Juliano (nick@arweave.org)

This document specifies **Comments** in the AO / Arweave ecosystem. A comment can be created on any atomic asset created on the permaweb, and interestingly is also an instantiation of an [atomic asset](./spec-atomic-assets.md) itself. By leveraging the Atomic Asset framework, each comment is a unique, ownable, and transferable digital object recorded on the permaweb. This approach ensures that interactions are both immutable and verifiable.

## Introduction

In the AO / Arweave ecosystem, comments are designed as specialized Atomic Assets that enable users to engage in discussions and provide feedback on digital items.

## Motivation

Comments play a critical role in fostering community engagement and dialogue around digital assets. Key motivations for implementing comments as Atomic Assets include:

**Interoperability**:
Comments adhere to the same standards as other atomic assets, ensuring seamless integration across various decentralized applications within the AO ecosystem.

**Digital Ownership and Authenticity**:

Each comment is uniquely associated with its creator, providing clear provenance and accountability.

Specification

1. Comments as Atomic Assets

Comments are implemented using the Atomic Asset model, with additional metadata to establish their relationships with other assets. In this context, every comment contains specific fields that link it to the asset it comments on:
• Data-Source (parentId):
This field identifies the immediate parent asset or comment that the new comment is directly responding to.
• Root-Source (rootId):
This field points to the original asset that initiated the conversation thread. For a top-level comment, the Root-Source is the same as the Data-Source. For replies within a thread, the Root-Source remains consistent with the initial asset.

2. Data Model

A comment, as an atomic asset, comprises the following elements:
• Identifier (ID):
A unique transaction identifier that serves as the comment’s permanent record on the permaweb.
• Creator:
The address or unique identifier of the user who created the comment.
• Content:
The textual body of the comment. Typically stored as plain text, the content forms the core of the comment.
• Relationship Tags:
• Data-Source:
Indicates the parent asset (or comment) that the comment is associated with.
• Root-Source:
Indicates the root asset of the conversation, providing context for the thread.
• Metadata:
Additional descriptive information may be included (such as a human-readable name or description) to assist in indexing, searching, or extending functionality.

3. Comment Creation Process

When a user creates a comment, the following steps are followed: 1. User Submission:
The user supplies the comment text along with identifiers for:
• The parent asset or comment (parentId).
• Optionally, the original asset (rootId) if replying within an ongoing conversation. If rootId is omitted, the system defaults to using parentId. 2. Atomic Asset Generation:
The comment is minted as an Atomic Asset with the assetType explicitly set to "comment". During this process, the system attaches the required tags:
• The Data-Source tag is set to the provided parentId.
• The Root-Source tag is set to the provided rootId (or parentId if no root is specified). 3. Data Storage:
The comment’s content is embedded within the asset’s data field, ensuring that it is permanently stored on the permaweb. 4. Recording:
Once created, the comment is broadcast and recorded on the Arweave blockchain, where it becomes an immutable part of the digital record.

4. Comment Retrieval and Querying

Comments can be retrieved by querying the permaweb for transactions with specific tags:
• Filtering by Relationship:
Developers can filter comment queries by the Data-Source and/or Root-Source tags. For example:
• To obtain all comments made directly on a particular asset, a query would filter for transactions where Data-Source matches the asset’s ID.
• To fetch an entire conversation thread, a query would filter using the Root-Source tag.
• Data Reconstruction:
Once retrieved, each comment’s details (such as content, creator, and relationship identifiers) are reconstructed from the associated transaction data.

5. Use Cases

The ability to add comments as Atomic Assets opens up various practical applications:
• Digital Art and Media:
Users can comment on creative works, such as digital art, music, or videos, directly on the permaweb.
• Social Interactions:
Decentralized social platforms can leverage this model to enable robust, immutable threaded discussions.
• Feedback Systems:
Providing verifiable and permanent feedback on products, services, or content.
• Collaborative Applications:
Facilitating discussions and annotations within decentralized project management or collaborative tools.

6. Security and Ownership
   • Immutability:
   Once created, a comment cannot be altered or deleted, ensuring the integrity of the conversation history.
   • Ownership:
   The comment is permanently associated with its creator, providing a clear record of authorship.
   • Verifiability:
   Using cryptographic techniques inherent to the Arweave blockchain, comments are tamper-proof and fully auditable.

## Conclusion

This specification outlines a robust framework for implementing comments on the permaweb by leveraging the Atomic Asset model. By embedding relationship tags—Data-Source (parentId) and Root-Source (rootId)—each comment is clearly associated with the digital asset it references, providing a reliable, immutable, and interoperable means of recording social interactions. This design not only supports current use cases but also offers a scalable foundation for future enhancements within the AO / Arweave ecosystem.
