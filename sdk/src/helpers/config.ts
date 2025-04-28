export const AO = {
	module: 'URgYpPQzvxxfYQtjrIQ116bl3YBfcImo3JEnNo8Hlrk',
	scheduler: '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA',
	mu: 'fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY',
	src: {
		asset: 'kJo3YG9tKpMhBJhB8GlvmsghmpbY1o7q2VRAh1LsgpI',
		collection: 'aHN0YxA7Th1OQdtgv0slWv9LMrvYukvNgWdkotJsML0',
		collectionActivity: 'k8K8WIJb5kXOVvZRFXF5GIZW-7b2NtaTOd6G-E5MF0k',
		profile: 'WBhJpPafkykqZZgTr7TAsz48RKG4vbOEAH4rZ3JxIQ8',
		// zone: 'f-Xac27OGcSSQuw8__BSwAauc4vANST92fZX2j0UJn0',
		zone: 'RUrvOwe3sXnzUx-lTnR290jemVp096yni-Wlyk7wdQk'
	},
	collectionRegistry: 'zwKi27GuKS3GOlwL3EhNGH02SJDDAO5Uy43ZJwomhZ4',
	profileRegistry: 'SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY'
};

export const HB = {
	node: 'https://router-1.forward.computer'
};

export const CONTENT_TYPES: { [key: string]: { type: string; serialize: (data: any) => any } } = {
	'application/json': {
		type: 'application/json',
		serialize: (data: any) => JSON.stringify(data),
	},
};

export const GATEWAYS = {
	arweave: 'arweave.net',
	goldsky: 'arweave-search.goldsky.com',
};

export const LICENSES = {
	udl: {
		label: 'Universal Data License',
		address: 'dE0rmDfl9_OWjkDznNEXHaSO_JohJkRolvMzaCroUdw',
	},
};

export const TAGS = {
	keys: {
		access: 'Access-Fee',
		ans110: {
			title: 'Title',
			description: 'Description',
			topic: 'Topic:*',
			type: 'Type',
			implements: 'Implements',
			license: 'License',
		},
		assetType: 'Asset-Type',
		banner: 'Banner',
		bootloader: 'Bootloader',
		bootloaderInit: 'On-Boot',
		collectionId: 'Collection-Id',
		collectionName: 'Collection-Name',
		commericalUse: 'Commercial-Use',
		contentType: 'Content-Type',
		creator: 'Creator',
		currency: 'Currency',
		dataModelTraining: 'Data-Model-Training',
		dataProtocol: 'Data-Protocol',
		dateCreated: 'Date-Created',
		derivations: 'Derivations',
		description: 'Description',
		displayName: 'Display-Name',
		handle: 'Handle',
		implements: 'Implements',
		initialOwner: 'Initial-Owner',
		license: 'License',
		name: 'Name',
		paymentAddress: 'Payment-Address',
		paymentMode: 'Payment-Mode',
		profileCreator: 'Profile-Creator',
		profileIndex: 'Profile-Index',
		protocolName: 'Protocol-Name',
		renderWith: 'Render-With',
		thumbnail: 'Thumbnail',
		title: 'Title',
		topic: 'Topic',
		type: 'Type',
		zoneType: 'Zone-Type',
	},
	values: {
		document: 'Document',
		user: 'User',
		zone: 'Permaweb-Zone'
	},
};

export const UPLOAD = {
	node1: 'https://up.arweave.net',
	node2: 'https://turbo.ardrive.io',
	batchSize: 1,
	chunkSize: 7500000,
	dispatchUploadSize: 100 * 1024,
};
