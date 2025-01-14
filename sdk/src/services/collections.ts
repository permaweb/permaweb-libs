import { aoDryRun, aoMessageResult, aoSend } from "common/ao";
import { resolveTransaction } from "common/arweave";
import { getGQLData } from "common/gql";
import { 
  TAGS, 
  CONTENT_TYPES, 
  AO, 
  DEFAULT_UCM_BANNER, 
  DEFAULT_UCM_THUMBNAIL, 
  GATEWAYS
} from "helpers/config";
import { getTxEndpoint } from "helpers/endpoints";
import { CollectionDetailType, CollectionType, DependencyType, TagType } from "helpers/types";
import { cleanTagValue, cleanProcessField } from "helpers/utils";

export function createCollectionWith(deps: DependencyType) {
  return async (
    args: { 
      walletAddress: string, 
      profileId: string,
      title: string,
      description: string,
      contentType: string,
      banner: any,
      thumbnail: any
    }
  ) => {
    if(!deps.signer) throw new Error(`Must provide a signer when initializing to create collections`);

    const dateTime = new Date().getTime().toString();
  
    const collectionTags: TagType[] = [
      { name: TAGS.keys.contentType, value: CONTENT_TYPES[args.contentType].type },
      { name: TAGS.keys.creator, value: args.walletAddress },
      { name: TAGS.keys.profileCreator, value: args.profileId },
      {
        name: TAGS.keys.ans110.title,
        value: cleanTagValue(args.title),
      },
      {
        name: TAGS.keys.ans110.description,
        value: cleanTagValue(args.description),
      },
      { name: TAGS.keys.ans110.type, value: TAGS.values.document },
      { name: TAGS.keys.dateCreated, value: dateTime },
      {
        name: TAGS.keys.name,
        value: cleanTagValue(args.title),
      },
      { name: 'Action', value: 'Add-Collection' },
    ];

    const bannerTx = args.banner ? await resolveTransaction(deps, args.banner) : DEFAULT_UCM_BANNER;
    const thumbnailTx = args.banner ? await resolveTransaction(deps, args.thumbnail) : DEFAULT_UCM_THUMBNAIL;
  
    if (args.banner) collectionTags.push({ 
      name: TAGS.keys.banner, 
      value: bannerTx
    });
  
    if (args.thumbnail) collectionTags.push({ 
      name: TAGS.keys.thumbnail, 
      value: thumbnailTx
    });
  
    const processSrcFetch = await fetch(getTxEndpoint(AO.src.collection));
    if (!processSrcFetch.ok) throw new Error(`Unable to fetch process src`)

    let processSrc = await processSrcFetch.text();
  
    processSrc = processSrc.replace(/'<NAME>'/g, cleanProcessField(args.title));
    processSrc = processSrc.replace(/'<DESCRIPTION>'/g, cleanProcessField(args.description));
    processSrc = processSrc.replace(/<CREATOR>/g, args.profileId);
    processSrc = processSrc.replace(/<BANNER>/g, bannerTx ? bannerTx : DEFAULT_UCM_BANNER);
    processSrc = processSrc.replace(/<THUMBNAIL>/g, thumbnailTx ? thumbnailTx : DEFAULT_UCM_THUMBNAIL);
    processSrc = processSrc.replace(/<DATECREATED>/g, dateTime);
    processSrc = processSrc.replace(/<LASTUPDATE>/g, dateTime);
  
    let processId: string | undefined = undefined;
    let retryCount = 0;
    const maxRetries = 25;
  
    while (!processId && retryCount < maxRetries) {
      try {
        processId = await deps.ao.spawn({
          module: AO.module,
          scheduler: AO.scheduler,
          signer: deps.signer,
          tags: collectionTags,
        });
        console.log(`Collection process: ${processId}`);
      } catch (e: any) {
        console.error(`Spawn attempt ${retryCount + 1} failed:`, e);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          throw new Error(`Failed to spawn process after ${maxRetries} attempts`);
        }
      }
    }
  
    let fetchedCollectionId: string | undefined = undefined;
    retryCount = 0;
    
    while (!fetchedCollectionId) {
      await new Promise((r) => setTimeout(r, 2000));
      const gqlResponse = await getGQLData({
        gateway: GATEWAYS.goldsky,
        ids: [processId ? processId : ''],
        owners: null,
        cursor: null
      });
  
      if (gqlResponse && gqlResponse.data.length) {
        console.log(`Fetched transaction`, gqlResponse.data[0].node.id, 0);
        fetchedCollectionId = gqlResponse.data[0].node.id;
      } else {
        console.log(`Transaction not found`, processId, 0);
        retryCount++;
        if (retryCount >= 10) {
          throw new Error(`Transaction not found after 10 attempts, process deployment retries failed`);
        }
      }
    }
  
    await deps.ao.message({
      process: processId,
      signer: deps.signer,
      tags: [{ name: 'Action', value: 'Eval' }],
      data: processSrc,
    });
    
    const registryTags = [
      { name: 'Action', value: 'Add-Collection' },
      { name: 'CollectionId', value: processId },
      { name: 'Name', value: cleanTagValue(args.title) },
      { name: 'Creator', value: args.profileId },
      { name: 'DateCreated', value: dateTime },
    ];

    if (bannerTx) registryTags.push({ name: 'Banner', value: bannerTx });
    if (thumbnailTx) registryTags.push({ name: 'Thumbnail', value: thumbnailTx });

    await deps.ao.message({
      process: AO.collectionsRegistry,
      signer: deps.signer,
      tags: registryTags,
    });

    await deps.ao.message({
      process: processId,
      signer: deps.signer,
      tags: [
        { name: 'Action', value: 'Add-Collection-To-Profile' },
        { name: 'ProfileProcess', value: args.profileId },
      ],
    });

    return processId;
  }
}

export function updateCollectionWith(deps: DependencyType) {
  return async(args: { 
    profileId: string, 
    collectionId: string, 
    assetIds: string[] 
  }): Promise<string> => {
    return await aoSend(deps, {
      processId: args.profileId,
      action: 'Run-Action',
      tags: null,
      data: {
        Target: args.collectionId,
        Action: 'Update-Assets',
        Input: JSON.stringify({
          AssetIds: args.assetIds,
          UpdateType: 'Add',
        }),
      }
    });
  }
}

export function getCollectionWith(deps: DependencyType) {
  return async(args: { id: string }): Promise<CollectionDetailType | null> => {
    const response = await aoDryRun(deps, {
      processId: args.id,
      action: 'Info',
    });

    const collection = {
      id: args.id,
      title: response.Name,
      description: response.Description,
      creator: response.Creator,
      dateCreated: response.DateCreated,
      banner: response.Banner ?? DEFAULT_UCM_BANNER,
      thumbnail: response.Thumbnail ?? DEFAULT_UCM_THUMBNAIL,
    };

    return {
      ...collection,
      assetIds: response.Assets,
      creatorProfile: null,
    };
  }
}

export function getCollectionsWith(deps: DependencyType) {
  return async (args: {creator?: string}): Promise<CollectionType[] | null> => {
    const action = args.creator ? 'Get-Collections-By-User' : 'Get-Collections';

    const response = await aoDryRun(deps, {
      processId: AO.collectionsRegistry,
      action: action,
      tags: args.creator ? [{ name: 'Creator', value: args.creator }] : null,
    });

    if (response && response.Collections && response.Collections.length) {
      const collections = response.Collections.map((collection: any) => {
        return {
          id: collection.Id,
          title: collection.Name.replace(/\[|\]/g, ''),
          description: collection.Description,
          creator: collection.Creator,
          dateCreated: collection.DateCreated,
          banner: collection.Banner,
          thumbnail: collection.Thumbnail,
        };
      });

      return collections;
    }

    return null;
  }
}