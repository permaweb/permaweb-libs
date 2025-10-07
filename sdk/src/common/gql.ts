import { GATEWAYS } from '../helpers/config.ts';
import {
	BatchAGQLResponseType,
	BatchGQLArgsType,
	DefaultGQLResponseType,
	GQLArgsType,
	GQLNodeResponseType,
	QueryBodyGQLArgsType,
} from '../helpers/types.ts';

const CURSORS = {
	p1: 'P1',
	end: 'END',
};

const PAGINATORS = {
	default: 100,
};

export async function getGQLData(args: GQLArgsType): Promise<DefaultGQLResponseType> {
	const paginator = args.paginator ? args.paginator : PAGINATORS.default;
	let data: GQLNodeResponseType[] = [];
	let count: number = 0;
	let nextCursor: string | null = null;

	if (args.ids && !args.ids.length) {
		return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
	}

	try {
		let queryBody: string = getQueryBody(args);
		const response = await getResponse({ gateway: args.gateway ?? GATEWAYS.ao, query: getQuery(queryBody) });

		if (response?.data?.transactions?.edges?.length) {
			data = [...response.data.transactions.edges];
			count = response.data.transactions.count ?? 0;

			const lastResults: boolean = data.length < paginator || !response.data.transactions.pageInfo.hasNextPage;

			if (lastResults) nextCursor = CURSORS.end;
			else nextCursor = data[data.length - 1].cursor;

			return {
				data: data,
				count: count,
				nextCursor: nextCursor,
				previousCursor: null,
			};
		} else {
			return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
		}
	} catch (e: any) {
		console.error(e);
		return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
	}
}

export async function getAggregatedGQLData(args: GQLArgsType, callback?: (message: string) => void) {
	let index = 1;
	let fetchResult = await getGQLData(args);

	if (fetchResult && fetchResult.data.length) {
		let aggregatedData = fetchResult.data;
		callback && callback(`Count: ${fetchResult.count}`);
		callback && callback(`Pages to fetch: ${Math.ceil(fetchResult.count / (args.paginator ?? PAGINATORS.default))}`);
		callback && callback(`Page ${index} fetched`);

		while (fetchResult.nextCursor && fetchResult.nextCursor !== CURSORS.end) {
			index += 1;
			callback && callback(`Fetching page ${index}...`);

			fetchResult = await getGQLData({
				...args,
				cursor: fetchResult.nextCursor,
			});

			if (fetchResult && fetchResult.data.length) {
				aggregatedData = aggregatedData.concat(fetchResult.data);
			}
		}

		callback && callback(`All pages fetched!`);
		return aggregatedData;
	} else {
		callback && callback('No data found');
	}

	return null;
}

export async function getBatchGQLData(args: BatchGQLArgsType): Promise<BatchAGQLResponseType> {
	let responseObject: BatchAGQLResponseType = {};
	let queryBody: string = '';

	for (const [queryKey, baseArgs] of Object.entries(args.entries)) {
		responseObject[queryKey] = { data: [], count: 0, nextCursor: null, previousCursor: null };
		queryBody += getQueryBody({ ...baseArgs, gateway: args.gateway ?? GATEWAYS.ao, queryKey: queryKey });
	}

	try {
		const response = await getResponse({ gateway: args.gateway ?? GATEWAYS.ao, query: getQuery(queryBody) });

		if (response && response.data) {
			for (const queryKey of Object.keys(response.data)) {
				const paginator = args.entries[queryKey].paginator ? args.entries[queryKey].paginator : PAGINATORS.default;

				let data: GQLNodeResponseType[] = [];
				let count: number = 0;
				let nextCursor: string | null = null;

				if (response.data[queryKey].edges.length) {
					data = [...response.data[queryKey].edges];
					count = response.data[queryKey].count ?? 0;

					const lastResults: boolean = data.length < paginator || !response.data[queryKey].pageInfo.hasNextPage;

					if (lastResults) nextCursor = CURSORS.end;
					else nextCursor = data[data.length - 1].cursor;

					responseObject[queryKey] = {
						data: [...response.data[queryKey].edges],
						count: count,
						nextCursor: nextCursor,
						previousCursor: null,
					};
				}
			}
		}
		return responseObject;
	} catch (e: any) {
		console.error(e);
		return responseObject;
	}
}

function getQuery(body: string): string {
	const query = { query: `query { ${body} }` };
	return JSON.stringify(query);
}

function getQueryBody(args: QueryBodyGQLArgsType): string {
	const paginator = args.paginator ? args.paginator : PAGINATORS.default;
	const ids = args.ids ? JSON.stringify(args.ids) : null;
	let blockFilter: { min?: number; max?: number } | null = null;
	if (args.minBlock !== undefined && args.minBlock !== null) {
		blockFilter = {};
		blockFilter.min = args.minBlock;
	}
	const blockFilterStr = blockFilter ? JSON.stringify(blockFilter).replace(/"([^"]+)":/g, '$1:') : null;
	const tags = args.tags
		? JSON.stringify(args.tags)
				.replace(/"(name)":/g, '$1:')
				.replace(/"(values)":/g, '$1:')
				.replace(/"match"/g, 'match')
				.replace(/"FUZZY_OR"/g, 'FUZZY_OR')
				.replace(/"WILDCARD"/g, 'WILDCARD')
		: null;
	const owners = args.owners ? JSON.stringify(args.owners) : null;
	const recipients = args.recipients ? JSON.stringify(args.recipients) : null;
	const cursor = args.cursor && args.cursor !== CURSORS.end ? `"${args.cursor}"` : null;

	let sort: string = '';
	if (args.sort) {
		sort += 'sort: ';
		switch (args.sort) {
			case 'ascending':
				sort += 'HEIGHT_ASC';
				break;
			case 'descending':
				sort += 'HEIGHT_DESC';
				break;
		}
	}

	let fetchCount: string = `first: ${paginator}`;
	let txCount: string = '';
	let nodeFields: string = `data { size type } owner { address } block { height timestamp }`;
	let recipientsfield: string = '';

	const gateway = args.gateway ?? GATEWAYS.ao;
	switch (gateway) {
		case GATEWAYS.arweave:
			break;
		case GATEWAYS.ao:
			if (!cursor) txCount = `count`;
			if (recipients) recipientsfield = `recipients: ${recipients}`;
			nodeFields += ` recipient`;
			break;
	}

	let body = `
		transactions(
				ids: ${ids},
				tags: ${tags},
				${fetchCount}
				owners: ${owners},
				${recipientsfield},
				block: ${blockFilterStr},
				after: ${cursor},
				${sort}
			){
			${txCount}
				pageInfo {
					hasNextPage
				}
				edges {
					cursor
					node {
						id
						tags {
							name 
							value 
						}
						${nodeFields}
					}
				}
		}`;

	if (args.queryKey) body = `${args.queryKey}: ${body}`;

	return body;
}

async function getResponse(args: { gateway: string; query: string }): Promise<any> {
	try {
		const response = await fetch(`https://${args.gateway}/graphql`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: args.query,
		});
		return await response.json();
	} catch (e: any) {
		throw e;
	}
}
