import { readFileSync } from 'fs';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import Permaweb from '@permaweb/permaweb-libs';
import Arweave from 'arweave';

const ao = connect();
const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET, 'utf-8'));
const signer = createDataItemSigner(wallet);
const arweave = Arweave.init();

const {
  createZone,
  updateZone,
  // TODO: Missing addToZone call
  // addToZone,
  getZone,
  createAtomicAsset,
  getAtomicAsset,
  getAtomicAssets,
  // TODO: Missing buildAsset call
  // buildAsset,
  createProfile,
  updateProfile,
  getProfileById,
  getProfileByWalletAddress,
  createCollection,
  updateCollection,
  getCollection,
  getCollections,
  createComment,
  getComment,
  getComments
} = Permaweb.init({ ao, signer, arweave });

function logTest(message) {
	console.log('\x1b[33m%s\x1b[0m', `\n${message}`);
}

const TRANSACTION_DELAY = 10000;

/*
  Currently this is just making sure everything runs
  we should add some assertions to it.
*/
async function runTests() {
  logTest('Testing zone creation...');
  const zoneId = await createZone([], (status) => console.log(`Callback: ${status}`));

  console.log(`Zone id: ${zoneId}`);

  logTest('Testing zone fetch...');
  await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
  let zone = await getZone(zoneId);

  console.log(`Zone: `, zone);

  logTest('Testing zone update...');
  const zoneUpdateId = await updateZone({
    data: {
      name: 'Sample Zone',
      metadata: {
        description: 'A test zone for unit testing',
        version: '1.0.0'
      }
    }
  }, zoneId);

  console.log(`Zone update id: ${zoneUpdateId}`);

  zone = await getZone(zoneId);

  console.log(`Zone: `, zone);

  logTest('Testing atomic asset creation...');
  const assetId = await createAtomicAsset({
    title: 'Test Asset',
    description: 'This is a test atomic asset',
    type: 'article',
    topics: ['test', 'atomic', 'asset'],
    contentType: 'text/plain',
    data: '1234',
    creator: zoneId,
    collectionId: 'CollectionId1234',
    supply: 100,
    denomination: 1,
    transferable: true
  }, (status) => console.log(`Callback: ${status}`));

  console.log(`Asset ID: ${assetId}`)

  logTest('Testing atomic asset fetch...');
  await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
  const asset = await getAtomicAsset(assetId);

  console.log(`Asset: `, asset);

  logTest('Testing atomic assets fetch...');
  const assets = await getAtomicAssets([assetId]);

  console.log(`Assets: `, assets);

  logTest('Testing create profile...');
  const profileId = await createProfile({
    username: 'Test User',
    displayName: 'Test Display',
    description: 'Test Description'
  });

  console.log(`Profile id ${profileId}`);

  logTest('Testing profile fetch...');
  await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
  let profile = await getProfileById(profileId);

  console.log(`Profile: `, profile);

  await updateProfile({
    username: 'Test User Update',
    displayName: 'Test Display Update',
    description: 'Test Description Update'
  }, profileId);

  let profileUpdated = await getProfileByWalletAddress(asset.owner);

  console.log(`Updated Profile: `, profileUpdated);

  logTest(`Testing collection create`);
  let collectionId = await createCollection({
    walletAddress: asset.owner, 
    profileId: profileId,
    title: 'Test Collection Title',
    description: 'Test Collection Description',
    contentType: 'application/json'
  });

  logTest(`Testing collection update`);
  await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
  await updateCollection({
    profileId,
    collectionId,
    assetIds: [assetId]
  });

  logTest(`Testing collection fetch`);
  let collection = await getCollection({id: collectionId});
  console.log(`Collection: `, collection);

  let collections = await getCollections({creator: collection.creator});
  console.log(`Collections: `, collections);

  logTest(`Test create comment`)
  const commentId = await createComment({
    title: 'Test Asset',
    description: 'This is a test atomic asset',
    type: 'article',
    topics: ['test', 'atomic', 'asset'],
    contentType: 'text/plain',
    data: '1234',
    creator: zoneId,
    collectionId: 'CollectionId1234',
    supply: 100,
    denomination: 1,
    transferable: true,
    dataSource: assetId,
    rootSource: assetId
  }, (status) => console.log(`Callback: ${status}`));

  await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));

  const comment = await getComment({ id: commentId })
  console.log(`Comment: `, comment);

  const comments = await getComments({ dataSource: assetId });

  console.log(`Comments fetch: `, comments);
}

runTests();