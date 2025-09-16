import { AO, GATEWAYS, HB } from '../helpers/config.ts';
import { getTxEndpoint } from '../helpers/endpoints.ts';
import {
	DependencyType,
	MessageDryRunType,
	MessageResultType,
	MessageSendType,
	ProcessCreateType,
	ProcessReadType,
	ProcessSpawnType,
	TagType,
} from '../helpers/types.ts';
import { getTagValue, globalLog } from '../helpers/utils.ts';

import { getGQLData } from './gql.ts';

const GATEWAY = GATEWAYS.ao;

const GATEWAY_RETRY_COUNT = 100;

export async function aoSpawn(deps: DependencyType, args: ProcessSpawnType): Promise<string> {
	const tags = [{ name: 'Authority', value: deps.node?.scheduler ?? AO.mu }];
	if (args.tags && args.tags.length > 0) args.tags.forEach((tag: TagType) => tags.push(tag));

	try {
		const processId = await deps.ao.spawn({
			module: args.module,
			scheduler: args.scheduler,
			signer: deps.signer,
			tags: tags,
			data: args.data,
		});

		globalLog(`Process ID: ${processId}`);
		globalLog('Sending initial message...');

		await aoSend(deps, {
			processId: processId,
			action: 'Init',
		});

		return processId;
	} catch (e: any) {
		console.log(e);
		throw new Error(e.message ?? 'Error spawning process');
	}
}

export function aoSendWith(deps: DependencyType) {
	return async (args: MessageSendType) => {
		return await aoSend(deps, args);
	};
}

export async function aoSend(deps: DependencyType, args: MessageSendType): Promise<string> {
	try {
		const tags: TagType[] = [{ name: 'Action', value: args.action }, { name: 'Message-Timestamp', value: new Date().getTime().toString() }];
		if (args.tags) tags.push(...args.tags);

		const data = args.useRawData ? args.data : JSON.stringify(args.data);

		const txId = await deps.ao.message({
			process: args.processId,
			signer: deps.signer,
			tags: tags,
			data: data,
		});

		return txId;
	} catch (e: any) {
		throw new Error(e);
	}
}

export function readProcessWith(deps: DependencyType) {
	return async (args: ProcessReadType) => {
		return await readProcess(deps, args);
	};
}

export async function readProcess(deps: DependencyType, args: ProcessReadType) {
	const node = deps.node?.url ?? HB.defaultNode
	let url = `${node}/${args.processId}~process@1.0/now/${args.path}`;
	if (args.serialize) url += '/serialize~json@1.0';

	try {
		const res = await fetch(url);
		if (res.ok) {
			return res.json();
		}

		throw new Error('Error getting state from HyperBEAM.')

	} catch (e: any) {
		if (args.fallbackAction) {
			const result = await aoDryRun(deps, { processId: args.processId, action: args.fallbackAction });
			return result;
		}
		throw e;
	}
}

export function aoDryRunWith(deps: DependencyType) {
	return async (args: MessageSendType) => {
		return await aoDryRun(deps, args);
	};
}

export async function aoDryRun(deps: DependencyType, args: MessageDryRunType): Promise<any> {
	try {
		const tags = [{ name: 'Action', value: args.action }];
		if (args.tags) tags.push(...args.tags);
		let dataPayload;
		if (typeof args.data === 'object') {
			dataPayload = JSON.stringify(args.data || {});
		} else if (typeof args.data === 'string') {
			try {
				JSON.parse(args.data);
			} catch (e) {
				console.error(e);
				throw new Error('Invalid JSON data');
			}
			dataPayload = args.data;
		}

		const response = await deps.ao.dryrun({
			process: args.processId,
			tags: tags,
			data: dataPayload,
		});

		if (response.Messages && response.Messages.length) {
			if (response.Messages[0].Data) {
				return JSON.parse(response.Messages[0].Data);
			} else {
				if (response.Messages[0].Tags) {
					return response.Messages[0].Tags.reduce((acc: any, item: any) => {
						acc[item.name] = item.value;
						return acc;
					}, {});
				}
			}
		}
	} catch (e: any) {
		throw new Error(e.message ?? 'Error dryrunning process');
	}
}

export async function aoMessageResult(deps: DependencyType, args: MessageResultType): Promise<any> {
	try {
		const { Messages } = await deps.ao.result({ message: args.messageId, process: args.processId });

		if (Messages && Messages.length) {
			const response: { [key: string]: any } = {};

			Messages.forEach((message: any) => {
				const action = getTagValue(message.Tags, 'Action') || args.action;

				let responseData = null;
				const messageData = message.Data;

				if (messageData) {
					try {
						responseData = JSON.parse(messageData);
					} catch {
						responseData = messageData;
					}
				}

				const responseStatus = getTagValue(message.Tags, 'Status');
				const responseMessage = getTagValue(message.Tags, 'Message');

				response[action] = {
					id: args.messageId,
					status: responseStatus,
					message: responseMessage,
					data: responseData,
				};
			});

			return response;
		} else return null;
	} catch (e) {
		console.error(e);
	}
}

export async function aoMessageResults(
	deps: DependencyType,
	args: {
		processId: string;
		action: string;
		tags: TagType[] | null;
		data: any;
		responses?: string[];
		handler?: string;
	},
): Promise<any> {
	try {
		const tags = [{ name: 'Action', value: args.action }];
		if (args.tags) tags.push(...args.tags);

		await deps.ao.message({
			process: args.processId,
			signer: deps.signer,
			tags: tags,
			data: JSON.stringify(args.data),
		});

		await new Promise((resolve) => setTimeout(resolve, 1000));

		const messageResults = await deps.ao.results({
			process: args.processId,
			sort: 'DESC',
			limit: 100,
		});

		if (messageResults && messageResults.edges && messageResults.edges.length) {
			const response: any = {};

			for (const result of messageResults.edges) {
				if (result.node && result.node.Messages && result.node.Messages.length) {
					const resultSet: any[] = [args.action];
					if (args.responses) resultSet.push(...args.responses);

					for (const message of result.node.Messages) {
						const action = getTagValue(message.Tags, 'Action');

						if (action) {
							let responseData = null;
							const messageData = message.Data;

							if (messageData) {
								try {
									responseData = JSON.parse(messageData);
								} catch {
									responseData = messageData;
								}
							}

							const responseStatus = getTagValue(message.Tags, 'Status');
							const responseMessage = getTagValue(message.Tags, 'Message');

							if (action === 'Action-Response') {
								const responseHandler = getTagValue(message.Tags, 'Handler');
								if (args.handler && args.handler === responseHandler) {
									response[action] = {
										status: responseStatus,
										message: responseMessage,
										data: responseData,
									};
								}
							} else {
								if (resultSet.indexOf(action) !== -1) {
									response[action] = {
										status: responseStatus,
										message: responseMessage,
										data: responseData,
									};
								}
							}

							if (Object.keys(response).length === resultSet.length) break;
						}
					}
				}
			}

			return response;
		}

		return null;
	} catch (e) {
		console.error(e);
	}
}

export async function handleProcessEval(
	deps: DependencyType,
	args: {
		processId: string;
		evalTxId?: string | null;
		evalSrc?: string | null;
		evalTags?: TagType[];
	},
): Promise<string | null> {
	let src: string | null = null;

	if (args.evalSrc) src = args.evalSrc;
	else if (args.evalTxId) src = await fetchProcessSrc(args.evalTxId);

	if (src) {
		try {
			const evalMessage = await aoSend(deps, {
				processId: args.processId,
				action: 'Eval',
				data: src,
				tags: args.evalTags || null,
				useRawData: true,
			});

			globalLog(`Eval: ${evalMessage}`);

			const evalResult = await aoMessageResult(deps, {
				processId: args.processId,
				messageId: evalMessage,
				action: 'Eval',
			});

			return evalResult;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error sending process eval');
		}
	}

	return null;
}

export function aoCreateProcessWith(deps: DependencyType) {
	return async (args: ProcessCreateType, statusCB?: (status: any) => void) => {
		try {
			const spawnArgs: any = {
				module: args.module || AO.module,
				scheduler: args.scheduler || AO.scheduler,
			};

			if (args.data) spawnArgs.data = args.data;
			if (args.tags) spawnArgs.tags = args.tags;

			statusCB && statusCB(`Spawning process...`);
			const processId = await aoSpawn(deps, spawnArgs);

			if (args.evalTxId || args.evalSrc) {
				statusCB && statusCB(`Process retrieved!`);
				statusCB && statusCB('Sending eval...');

				try {
					const evalResult = await handleProcessEval(deps, {
						processId: processId,
						evalTxId: args.evalTxId || null,
						evalSrc: args.evalSrc || null,
						evalTags: args.evalTags,
					});

					if (evalResult && statusCB) statusCB('Eval complete');
				} catch (e: any) {
					throw new Error(e.message ?? 'Error creating process');
				}
			}

			return processId;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error creating process');
		}
	};
}

export async function aoCreateProcess(
	deps: DependencyType,
	args: ProcessCreateType,
	statusCB?: (status: any) => void,
): Promise<string> {
	try {
		const spawnArgs: any = {
			module: args.module || AO.module,
			scheduler: args.scheduler || AO.scheduler,
		};

		if (args.data) spawnArgs.data = args.data;
		if (args.tags) spawnArgs.tags = args.tags;

		statusCB && statusCB(`Spawning process...`);
		const processId = await aoSpawn(deps, spawnArgs);

		if (args.evalTxId || args.evalSrc) {
			statusCB && statusCB(`Process retrieved!`);
			statusCB && statusCB('Sending eval...');

			try {
				const evalResult = await handleProcessEval(deps, {
					processId: processId,
					evalTxId: args.evalTxId || null,
					evalSrc: args.evalSrc || null,
					evalTags: args.evalTags,
				});

				if (evalResult && statusCB) statusCB('Eval complete');
			} catch (e: any) {
				throw new Error(e.message ?? 'Error creating process');
			}
		}

		return processId;
	} catch (e: any) {
		throw new Error(e.message ?? 'Error creating process');
	}
}

export async function fetchProcessSrc(txId: string): Promise<string> {
	try {
		const srcFetch = await fetch(getTxEndpoint(txId));
		return await srcFetch.text();
	} catch (e: any) {
		throw new Error(e);
	}
}

export async function waitForProcess(args: { processId: string; noRetryLimit?: boolean }) {
	let retries = 0;
	const retryLimit = args.noRetryLimit ? Infinity : GATEWAY_RETRY_COUNT;

	while (retries < retryLimit) {
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const gqlResponse = await getGQLData({
			gateway: GATEWAY,
			ids: [args.processId],
		});

		if (gqlResponse?.data?.length) {
			const foundProcess = gqlResponse.data[0].node.id;
			globalLog(`Process found: ${foundProcess} (Try ${retries + 1})`);
			return foundProcess;
		} else {
			globalLog(`Process not found: ${args.processId} (Try ${retries + 1})`);
			retries++;
		}
	}

	if (retryLimit !== Infinity) {
		throw new Error(`Process not found, please try again`);
	}
}
