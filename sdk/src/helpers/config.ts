export const AO = {
	module: 'URgYpPQzvxxfYQtjrIQ116bl3YBfcImo3JEnNo8Hlrk',
	scheduler: '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA',
	mu: 'fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY',
	src: {
		asset: 'dvlU-5HfAPWcukvnRHwSzMSEsoCqkZAEQsykMQgQ-wE',
		collection: 'EmeE2B70hVDdhr9fWou3i_nKARSb_6LXvxRFTH67qvU',
		collectionActivity: '8cQtC9TsWURFzboq1aozm8VbzRBc5GGVt7yB80kapfc',
		zone: {
			id: 'xuDE3S16-8sPV67FkZdI-7XAPYtupZFOo4ldyz2jzXg',
			version: '0.0.2',
		},
	},
	collectionRegistry: 'zwKi27GuKS3GOlwL3EhNGH02SJDDAO5Uy43ZJwomhZ4',
};

export const HB = {
	defaultNode: 'https://forward.computer',
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
		onBoot: 'On-Boot',
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
		zone: 'Permaweb-Zone',
	},
};

export const UPLOAD = {
	node1: 'https://turbo.ardrive.io',
	batchSize: 1,
	chunkSize: 7500000,
	dispatchUploadSize: 100 * 1024,
};
