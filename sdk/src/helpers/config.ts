export const AO = {
	module: 'oKBlsMP3UWrAUURWUzGO4ZGEqlurAL5UkidMLrYo8EM',
	scheduler: '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA',
	mu: 'fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY',
	src: {
		// asset: 'KnGqTZnqT-vCMiOJfZaFrLj_ur6pxs3iuQuf7WnhYIw',
		asset: 'OM6b2xWw3Wo5YCYKhD_N5qslF9wCIUhu7fXoTq1Q3uU',
		zone: 'q752vOrOkW1Fe_y3DFpo-ARz9obpvUpv6DRmP4svSQY'
	}
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
		address: 'dE0rmDfl9_OWjkDznNEXHaSO_JohJkRolvMzaCroUdw'
	},
};

export const TAGS = {
	keys: {
		access: 'Access-Fee',
		avatar: 'Avatar',
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
		profileIndex: 'Profile-Index',
		protocolName: 'Protocol-Name',
		renderWith: 'Render-With',
		thumbnail: 'Thumbnail',
		title: 'Title',
		topic: 'Topic',
		type: 'Type',
	}
};

export const UPLOAD = {
	node1: 'https://up.arweave.net',
	node2: 'https://turbo.ardrive.io',
	batchSize: 1,
	chunkSize: 7500000,
	dispatchUploadSize: 100 * 1024,
};