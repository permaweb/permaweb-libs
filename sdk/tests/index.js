import { readFileSync } from 'fs';

import Arweave from 'arweave';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import Permaweb from '@permaweb/libs';

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

const permaweb = Permaweb.init({
	ao: connect(),
	arweave: Arweave.init(),
	signer: createDataItemSigner(JSON.parse(readFileSync(process.env.PATH_TO_WALLET), 'utf-8'))
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
	}
	catch (e) {
		logError(e.message ?? 'Profile tests failed');
	}
}

async function testAssets() {
	try {
		logTest('Testing asset creation...');
	}
	catch (e) {
		logError(e.message ?? 'Asset tests failed');
	}
}

async function testComments() {
	try {
		logTest('Testing comment creation...');
	}
	catch (e) {
		logError(e.message ?? 'Comment tests failed');
	}
}

async function testCollections() {
	try {
		logTest('Testing collection creation...');
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
})()