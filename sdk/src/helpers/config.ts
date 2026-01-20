export const AO = {
	module: 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s',
	scheduler: '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA',
	mu: 'fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY',
	src: {
		asset: 'gqzwDfkE7fOGCL2scXHptIX6HoscikEGeqFE31yGZd4',
		collection: 'x35anB0wqaCdjtketSkiLPrH4_jR_GWSUFTSK8fyaZU',
		collectionActivity: 'qjpg3ramJVb2iF6O5BAUfKInQ0UHhi3NqfELh73qKGw',
		comments: 'HxZOaxNkL5o0QjAFmoU67HNwaMi7TEjUTmF7rfd2Ye0',
		moderation: 'TGCoo6JDvZ7JY_E5Smz5VQiI9ncc6uXI8tU_snAodl0',
		zone: {
			id: 'TsQmPFp6egCo5Wj0okHMxqJx-7EETIBIYLCxat1_QVU',
			version: '0.0.16',
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
	ao: 'ao-search-gateway.goldsky.com',
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
		dataProtocol: 'ao',
		document: 'Document',
		user: 'User',
	},
};

export const UPLOAD = {
	node1: 'https://turbo.ardrive.io',
	batchSize: 1,
	chunkSize: 7500000,
	dispatchUploadSize: 100 * 1024,
};
