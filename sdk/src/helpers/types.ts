export type DependencyType = {
	ao: any;
	signer?: any;
	arweave?: any;
	node?: { url: string, scheduler: string };
};

export type ProcessReadType = {
	processId: string;
	path: string;
	fallbackAction: string;
	serialize?: boolean;
};

export type ProcessSpawnType = {
	module: string;
	scheduler: string;
	data: any;
	tags: TagType[];
	wallet: any;
};

export type ProcessCreateType = {
	module?: string;
	scheduler?: string;
	data?: any;
	tags?: TagType[];
	evalTags?: TagType[];
	evalTxId?: string;
	evalSrc?: string;
};

export type MessageSendType = {
	processId: string;
	action: string;
	tags?: TagType[] | null;
	data?: any;
	useRawData?: boolean;
};

export type MessageResultType = {
	messageId: string;
	processId: string;
	action: string;
};

export type MessageDryRunType = {
	processId: string;
	action: string;
	tags?: TagType[] | null;
	data?: string | object;
};

export type ZoneType = { store: any; assets: ZoneAssetType[] };

export type ZoneAssetType = { id: string; balance: string; dateCreated: number; lastUpdate: number };

export type ProfileArgsType = {
	username: string;
	displayName: string;
	description: string;
	thumbnail?: any;
	banner?: any;
};

export type ProfileType = {
	id: string;
	walletAddress: string;
	username: string;
	displayName: string;
	description: string;
	thumbnail?: any;
	banner?: any;
	assets: { id: string; quantity: string }[];
} & any;

export type AssetCreateArgsType = {
	name: string;
	description: string;
	topics: string[];
	creator: string;
	data: any;
	contentType: string;
	assetType: string;
	supply?: number;
	denomination?: number;
	transferable?: boolean;
	metadata?: object;
	tags?: TagType[];
	src?: string;
	users?: string[];
	spawnComments?: boolean;
	commentsId?: string;
};

export type AssetHeaderType = {
	id: string;
	owner: string | null;
};

export type AssetDetailType = {
	id: string;
	name: string;
	ticker: string;
	denomination: string;
	totalSupply: string;
	transferable: string;
	creator: string;
	balances: object;
	metadata: any;
	dateCreated: string;
	lastUpdate: string;
};

export type CommentHeaderType = {
	id: string;
	content: string;
	parentId: string;
	rootId: string;
};

export type CommentDetailType = {
	content: string;
	parentId: string;
	rootId: string;
};

export type CommentCreateArgType = {
	content: string;
	creator: string;
	commentsId: string;
	parentId?: string;
	rootId?: string;
	tags?: TagType[];
};

export type CollectionManifestType = {
	type: string;
	items: string[];
};

export type CollectionType = {
	id: string;
	title: string;
	description: string | null;
	creator: string;
	dateCreated: string;
	banner: string | null;
	thumbnail: string | null;
};

export type CollectionDetailType = CollectionType & {
	assetIds: string[];
};

export type UDLicenseType = {
	access: UDLicenseValueType | null;
	derivations: UDLicenseValueType | null;
	commercialUse: UDLicenseValueType | null;
	dataModelTraining: UDLicenseValueType | null;
	paymentMode: string | null;
	paymentAddress: string | null;
	currency: string | null;
};

export type UDLicenseValueType = {
	value: string | null;
	icon?: string;
	endText?: string;
};

export type BaseGQLArgsType = {
	ids?: string[] | null;
	tags?: TagFilterType[] | null;
	owners?: string[] | null;
	recipients?: string[] | null;
	cursor?: string | null;
	paginator?: number;
	minBlock?: number;
	maxBlock?: number;
	sort?: GQLSortType;
};

export type GQLArgsType = { gateway: string } & BaseGQLArgsType;

export type QueryBodyGQLArgsType = BaseGQLArgsType & { gateway?: string; queryKey?: string };

export type BatchGQLArgsType = {
	gateway: string;
	entries: { [queryKey: string]: BaseGQLArgsType };
};

export type GQLNodeResponseType = {
	cursor: string | null;
	node: {
		id: string;
		tags: TagType[];
		recipient?: string;
		data: {
			size: string;
			type: string;
		};
		owner: {
			address: string;
		};
		block: {
			height: number;
			timestamp: number;
		};
	};
};

export type GQLResponseType = {
	count: number;
	nextCursor: string | null;
	previousCursor: string | null;
};

export type DefaultGQLResponseType = {
	data: GQLNodeResponseType[];
} & GQLResponseType;

export type BatchAGQLResponseType = { [queryKey: string]: DefaultGQLResponseType };

export type TagType = { name: string; value: string };

export type TagFilterType = { name: string; values: string[]; match?: string };

export type GQLSortType = 'ascending' | 'descending';
