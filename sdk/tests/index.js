import { readFileSync } from 'fs';

import Arweave from 'arweave';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import Permaweb from '@permaweb/libs';

const PARENT_ASSET_ID = 'PARENT_ASSET_ID';
const CREATOR = 'CREATOR_ADDRESS';

function expect(actual) {
	return {
		toBeDefined: () => {
			if (actual === undefined) {
				throw new Error(`Expected value to be defined, but it was undefined`);
			}
			console.log('\x1b[32m%s\x1b[0m', 'Success: Value is defined');
		},
		toHaveProperty: (prop) => {
			if (!(prop in actual)) {
				throw new Error(`Expected object to have property '${prop}', but it was not found`);
			}
			console.log('\x1b[32m%s\x1b[0m', `Success: Object has property '${prop}'`);
		},
		toEqualType: (expected) => {
			const actualType = typeof actual;
			const expectedType = typeof expected;

			if (actualType !== expectedType) {
				throw new Error(`Type mismatch: expected ${expectedType}, but got ${actualType}`);
			}

			if (actualType === 'object' && actual !== null && expected !== null) {
				if (Array.isArray(actual) !== Array.isArray(expected)) {
					throw new Error(
						`Type mismatch: expected ${Array.isArray(expected) ? 'array' : 'object'}, but got ${Array.isArray(actual) ? 'array' : 'object'}`,
					);
				}
			}
			console.log('\x1b[32m%s\x1b[0m', `Success: Types match (${actualType})`);
		},
		toEqual: (expected) => {
			const actualType = typeof actual;
			const expectedType = typeof expected;

			if (actualType !== expectedType) {
				throw new Error(`Type mismatch: expected ${expectedType}, but got ${actualType}`);
			}

			if (actualType === 'object' && actual !== null && expected !== null) {
				const actualKeys = Object.keys(actual);
				const expectedKeys = Object.keys(expected);

				if (actualKeys.length !== expectedKeys.length) {
					throw new Error(`Object key count mismatch: expected ${expectedKeys.length}, but got ${actualKeys.length}`);
				}

				for (const key of actualKeys) {
					if (!(key in expected)) {
						throw new Error(`Expected object is missing key: ${key}`);
					}
					expect(actual[key]).toEqual(expected[key]);
				}
			} else if (actual !== expected) {
				throw new Error(`Value mismatch: expected ${expected}, but got ${actual}`);
			}
			console.log('\x1b[32m%s\x1b[0m', 'Success: Values are equal');
		},
	};
}

function logTest(message) {
	console.log('\x1b[33m%s\x1b[0m', `\n${message}`);
}

function logError(message) {
	console.error('\x1b[31m%s\x1b[0m', `Error (${message})`);
}

(async function () {
	const ao = connect();
	const arweave = Arweave.init();

	logTest('Generating wallet...');
	const wallet = await arweave.wallets.generate();

	console.log(`Wallet address: ${await arweave.wallets.jwkToAddress(wallet)}`);

	const permaweb = Permaweb.init({
		ao: ao,
		arweave: arweave,
		signer: createDataItemSigner(wallet),
	});

	async function testZones() {
		try {
			logTest('Testing zone creation...');
			const zoneId = await permaweb.createZone([], (status) => console.log(`Callback: ${status}`));

			expect(zoneId).toBeDefined();
			expect(zoneId).toEqualType('string');

			logTest('Testing zone update...');
			const zoneUpdateId = await permaweb.updateZone({
				data: {
					name: 'Sample Zone',
					metadata: {
						description: 'A test zone for unit testing',
						version: '1.0.0',
					},
				},
			}, zoneId);

			expect(zoneUpdateId).toBeDefined();
			expect(zoneUpdateId).toEqualType('string');

			logTest('Testing zone fetch...');
			const zone = await permaweb.getZone(zoneId);

			expect(zone).toEqual({
				store: {
					name: 'Sample Zone',
					metadata: {
						description: 'A test zone for unit testing',
						version: '1.0.0',
					},
				},
				assets: [],
			});
		}
		catch (e) {
			logError(e.message ?? 'Zone tests failed');
		}
	}

	async function testProfiles() {
		try {
			logTest('Testing profile creation...');
			const profileId = await permaweb.createProfile({
				username: 'My username',
				displayName: 'My display name',
				description: 'My description'
			}, (status) => console.log(`Callback: ${status}`));

			expect(profileId).toBeDefined();
			expect(profileId).toEqualType('string');

			logTest('Testing profile fetch by ID...');
			const profileById = await permaweb.getProfileById(profileId);

			expect(profileById).toBeDefined();
			expect(profileById.username).toEqual('My username');

			logTest('Testing profile fetch by address...');
			const profileByWalletAddress = await permaweb.getProfileByWalletAddress(await arweave.wallets.jwkToAddress(wallet));

			expect(profileByWalletAddress).toBeDefined();
			expect(profileByWalletAddress.username).toEqual('My username');
		}
		catch (e) {
			logError(e.message ?? 'Profile tests failed');
		}
	}

	async function testAssets() {
		try {
			logTest('Testing asset creation...');
			const assetId = await permaweb.createAtomicAsset({
				name: 'Example Name',
				description: 'Example Description',
				creator: CREATOR,
				type: 'Example Atomic Asset Type',
				topics: ['Topic 1', 'Topic 2', 'Topic 3'],
				contentType: 'text/plain',
				data: '1234'
			});

			expect(assetId).toBeDefined();
			expect(assetId).toEqualType('string');

			logTest('Testing asset fetch...')
			const asset = await permaweb.getAtomicAsset(assetId);

			console.log(asset)

			expect(asset).toBeDefined();
			expect(asset.name).toEqual('Example Name');

			logTest('Testing asset update...');
			const data = permaweb.mapToProcessCase({
				name: 'Updated Name',
				description: 'Updated Description',
				status: 'Updated Status',
				content: 'My Post Content',
				topics: ['Topic 1'],
				categories: ['Category 1'],
			});

			await permaweb.sendMessage({
				processId: assetId,
				wallet: wallet,
				action: 'Update-Asset',
				data: data,
			});

			logTest('Testing updated asset fetch...');
			const updatedAsset = await permaweb.getAtomicAsset(assetId);

			console.log(updatedAsset);

		}
		catch (e) {
			logError(e.message ?? 'Asset tests failed');
		}
	}

	async function testComments() {
		try {
			logTest('Testing comment creation...');
			const commentId1 = await permaweb.createComment({
				creator: CREATOR,
				content: 'My first comment',
				parentId: PARENT_ASSET_ID
			}, (status) => console.log(`Callback: ${status}`));

			expect(commentId1).toBeDefined();
			expect(commentId1).toEqualType('string');

			logTest('Testing comment fetch...');
			const comment = await permaweb.getComment(commentId1);

			expect(comment).toBeDefined();
			expect(comment.id).toEqual(commentId1);

			logTest('Creating comment for batch query...');
			const commentId2 = await permaweb.createComment({
				creator: CREATOR,
				content: 'My second comment',
				parentId: PARENT_ASSET_ID
			}, (status) => console.log(`Callback: ${status}`));

			expect(commentId2).toBeDefined();
			expect(commentId2).toEqualType('string');

			logTest('Testing comments fetch...');
			const comments = await permaweb.getComments({ parentId: PARENT_ASSET_ID });

			expect(comments).toBeDefined();
		}
		catch (e) {
			logError(e.message ?? 'Comment tests failed');
		}
	}

	async function testCollections() {
		try {
			logTest('Creating profile to own collection...')
			const profileId = await permaweb.createProfile({
				username: 'My username',
				displayName: 'My display name',
				description: 'My description'
			}, (status) => console.log(`Callback: ${status}`));

			logTest('Testing collection creation...');
			const collectionId = await permaweb.createCollection({
				title: "Sample collection title",
				description: "Sample collection description",
				creator: profileId
			});

			expect(collectionId).toBeDefined();
			expect(collectionId).toEqualType('string');

			logTest('Testing collection fetch...');
			const collection = await permaweb.getCollection(collectionId);

			expect(collection).toBeDefined();
			expect(collection.id).toEqual(collectionId);

			logTest('Testing collection assets update...');
			const collectionUpdateId = await permaweb.updateCollectionAssets({
				collectionId: collectionId,
				assetIds: [
					"BvKq3F8psspbAvIDBAlgiG3E_XwiszSfJIYSg3kl0BU",
					"Loe-SwVioq8_xqbbzM-0TxMC4Lq8IobHNLyHQWgxaGk",
				],
				creator: profileId,
				updateType: "Add",
			});

			expect(collectionUpdateId).toBeDefined();
			expect(collectionUpdateId).toEqualType("string");

			logTest('Sleeping for collection update...');
			await new Promise((r) => setTimeout(r, 5000));

			logTest('Testing updated collection fetch...');
			const updatedCollection = await permaweb.getCollection(collectionId);

			console.log(updatedCollection);

			expect(updatedCollection).toBeDefined();
			
			const expectedAssets = [
				"BvKq3F8psspbAvIDBAlgiG3E_XwiszSfJIYSg3kl0BU",
				"Loe-SwVioq8_xqbbzM-0TxMC4Lq8IobHNLyHQWgxaGk",
			].sort();

			const actualAssets = updatedCollection.assetIds.sort();

			expect(actualAssets).toEqual(expectedAssets);
		}
		catch (e) {
			logError(e.message ?? 'Collection tests failed');
		}
	}

	const testMap = {
		zones: { key: 'zones', fn: testZones },
		profiles: { key: 'profiles', fn: testProfiles },
		assets: { key: 'assets', fn: testAssets },
		comments: { key: 'comments', fn: testComments },
		collections: { key: 'assets', fn: testCollections },
	};

	(async function () {
		const testType = process.argv[2];
		if (!testType || testType === 'all') {
			for (const testKey in testMap) {
				await testMap[testKey].fn();
			}
		} else if (testMap[testType]) {
			await testMap[testType].fn();
		} else {
			console.log(`Invalid test type. Specify one of: ${Object.keys(testMap).join(', ')}, or 'all'.`);
		}
	})();
})();