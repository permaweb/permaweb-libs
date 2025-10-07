export type DependencyType = {
  ao: any,
  signer?: any,
  arweave?: any
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
	spawnData?: any;
	spawnTags?: TagType[];
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

export type ZoneType = { store: any, assets: ZoneAssetType[] };

export type ZoneAssetType = { id: string, balance: string, dateCreated: number, lastUpdate: number }

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
	assets: { id: string, quantity: string }[];
} & any;

export type AssetCreateArgsType = {
	title: string;
	description: string;
	type: string;
	topics: string[];
	contentType: string;
	data: any;
	creator?: string;
	collectionId?: string;
	renderWith?: string;
	thumbnail?: string;
	supply?: number;
	denomination?: number;
	transferable?: boolean;
	tags?: TagType[];
	src?: string;
};

export type AssetHeaderType = {
	id: string;
	owner: string | null;
	creator: string | null;
	title: string | null;
	description: string | null;
	type: string | null;
	topics: string[] | null;
	implementation: string | null;
	contentType: string | null;
	renderWith: string | null;
	thumbnail: string | null;
	udl: UDLicenseType | null;
	collectionId: string | null;
	dateCreated: number | null;
	blockHeight: number | null;
	tags?: TagType[];
};

export type AssetStateType = {
	ticker: string | null;
	denomination: string | null;
	balances: { [key: string]: string } | null;
	transferable: boolean | null;
}

export type AoAssetType = {
	ticker: string;
	denomination: string;
	balances: {
		[key: string]: string;
	};
	transferable: boolean;
	name: string;
	creator: string;
	assetMetadata: {
		[key: string]: any;
	};
};

export type AssetDetailType = AssetHeaderType & AssetStateType;

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
	creatorProfile: ProfileType;
};

export type CommentHeaderType = AssetHeaderType & { dataSource: string, rootSource: string };

export type CommentStateType = AssetStateType;

export type CommentDetailType = CommentHeaderType & CommentStateType;

export type CommentCreateArgType = AssetCreateArgsType & { dataSource: string, rootSource: string };

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
	cursor?: string | null;
	paginator?: number;
	minBlock?: number;
	maxBlock?: number;
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

export type ModerationActionType = 'hide' | 'remove' | 'restore';

export type ModerationEntryType = {
	commentId: string;
	action: ModerationActionType;
	reason?: string;
	moderator: string;
	dateCreated: number;
	dataSource?: string;
	rootSource?: string;
};

export type TagType = { name: string; value: string };

export type TagFilterType = { name: string; values: string[]; match?: string };
