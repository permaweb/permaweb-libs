import { aoDryRun, aoSend, readProcess } from '../common/ao.ts';
import { CommentCreateArgType, CommentRulesType, DependencyType } from '../helpers/types.ts';
import { mapFromProcessCase } from '../helpers/utils.ts';

export function createCommentWith(deps: DependencyType) {
	return async (args: CommentCreateArgType) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');
			if (!args.content) throw new Error('Content cannot be empty');

			const tags = [];
			if (args.parentId) tags.push({ name: 'Parent-Id', value: args.parentId });
			if (args.tipReceiptId) tags.push({ name: 'Tip-Receipt-Id', value: args.tipReceiptId });
			if (args.metadata) tags.push({ name: 'Metadata', value: JSON.stringify(args.metadata) });

			const commentsUpdateId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Add-Comment',
				tags: tags,
				data: args.content,
				useRawData: true,
			});

			return commentsUpdateId;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error creating comment');
		}
	};
}

export function getCommentsWith(deps: DependencyType) {
	return async (args: { commentsId: string }) => {
		try {
			if (!args.commentsId) throw new Error(`Must provide commentsId`);

			const comments = mapFromProcessCase(
				await readProcess(deps, {
					processId: args.commentsId,
					path: 'comments',
					fallbackAction: 'Get-Comments',
				}),
			);

			return comments;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error getting comments');
		}
	};
}

export function getPaidCommentsWith(deps: DependencyType) {
	return async (args: { commentsId: string }) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');

			const comments = mapFromProcessCase(await aoDryRun(deps, { processId: args.commentsId, action: 'Get-Paid-Comments' }));

			return comments;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error getting paid comments');
		}
	};
}

export function updateCommentStatusWith(deps: DependencyType) {
	return async (args: { commentsId: string; commentId: string; status: 'active' | 'inactive' }) => {
		try {
			if (!args.commentsId) throw new Error(`Must provide commentsId`);
			if (!args.commentId) throw new Error(`Must provide commentId`);

			const commentUpdateId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Update-Comment-Status',
				tags: [
					{ name: 'Comment-Id', value: args.commentId },
					{ name: 'Status', value: args.status },
				],
			});

			return commentUpdateId;
		} catch (e: any) {
			throw new Error(e.message ?? 'Error updating comment status');
		}
	};
}

export function updateCommentContentWith(deps: DependencyType) {
	return async (args: { commentsId: string; commentId: string; content: string }) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');
			if (!args.commentId) throw new Error('Must provide commentId');
			if (!args.content) throw new Error('Content cannot be empty');

			const txId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Update-Comment-Content',
				tags: [{ name: 'Comment-Id', value: args.commentId }],
				data: args.content,
				useRawData: true,
			});

			return txId;
		} catch (e: any) {
			throw new Error(`Error at 'updateCommentContentWith' doing 'Update-Comment-Content': ${e?.message ?? String(e)}`);
		}
	};
}

export function removeCommentWith(deps: DependencyType) {
	return async (args: { commentsId: string; commentId: string }) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');
			if (!args.commentId) throw new Error('Must provide commentId');

			const txId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Remove-Comment',
				tags: [{ name: 'Comment-Id', value: args.commentId }],
			});

			return txId;
		} catch (e: any) {
			throw new Error(`Error at 'removeCommentWith' doing 'Remove-Comment': ${e?.message ?? String(e)}`);
		}
	};
}

export function removeUserCommentWith(deps: DependencyType) {
	return async (args: { commentsId: string; commentId: string }) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');
			if (!args.commentId) throw new Error('Must provide commentId');

			const txId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Remove-Own-Comment',
				tags: [{ name: 'Comment-Id', value: args.commentId }],
			});

			return txId;
		} catch (e: any) {
			throw new Error(`Error at 'removeUserCommentWith' doing 'Remove-Own-Comment': ${e?.message ?? String(e)}`);
		}
	};
}

export function pinCommentWith(deps: DependencyType) {
	return async (args: { commentsId: string; commentId: string }) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');
			if (!args.commentId) throw new Error('Must provide commentId');

			const txId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Pin-Comment',
				tags: [{ name: 'Comment-Id', value: args.commentId }],
			});

			return txId;
		} catch (e: any) {
			throw new Error(`Error at 'pinCommentWith' doing 'Pin-Comment': ${e?.message ?? String(e)}`);
		}
	};
}

export function unpinCommentWith(deps: DependencyType) {
	return async (args: { commentsId: string; commentId: string }) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');
			if (!args.commentId) throw new Error('Must provide commentId');

			const txId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Unpin-Comment',
				tags: [{ name: 'Comment-Id', value: args.commentId }],
			});

			return txId;
		} catch (e: any) {
			throw new Error(`Error at 'unpinCommentWith' doing 'Unpin-Comment': ${e?.message ?? String(e)}`);
		}
	};
}

export function getRulesWith(deps: DependencyType) {
	return async (args: { commentsId: string }) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');

			const rules = mapFromProcessCase(
				await readProcess(deps, {
					processId: args.commentsId,
					path: 'rules',
					fallbackAction: 'Get-Rules',
				}),
			);

			return rules as CommentRulesType;
		} catch (e: any) {
			throw new Error(`Error at 'getRulesWith' doing 'Get-Rules': ${e?.message ?? String(e)}`);
		}
	};
}

export function updateRulesWith(deps: DependencyType) {
	return async (args: { commentsId: string; rules: CommentRulesType }) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');
			if (!args.rules) throw new Error('Must provide rules');

			const data = {
				ProfileAgeRequired: args.rules.profileAgeRequired,
				MutedWords: args.rules.mutedWords,
				RequireProfileThumbnail: args.rules.requireProfileThumbnail,
				EnableTipping: args.rules.enableTipping,
				RequireTipToComment: args.rules.requireTipToComment,
				TipAssetId: args.rules.tipAssetId,
				MinTipAmount: args.rules.minTipAmount,
				HighlightPaidComments: args.rules.highlightPaidComments,
				ShowPaidTab: args.rules.showPaidTab,
			};

			const txId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Update-Rules',
				data,
			});

			return txId;
		} catch (e: any) {
			throw new Error(`Error at 'updateRulesWith' doing 'Update-Rules': ${e?.message ?? String(e)}`);
		}
	};
}

export function tipAndCreateCommentWith(deps: DependencyType) {
	return async (args: {
		tipAssetId: string;
		commentsId: string;
		quantity: string;
		content: string;
		parentId?: string;
		metadata?: object;
	}) => {
		try {
			if (!args.tipAssetId) throw new Error('Must provide tipAssetId');
			if (!args.commentsId) throw new Error('Must provide commentsId');
			if (!args.quantity) throw new Error('Must provide quantity');
			if (!args.content) throw new Error('Content cannot be empty');

			const tipReceiptId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

			const tipTxId = await aoSend(deps, {
				processId: args.tipAssetId,
				action: 'Transfer',
				tags: [
					{ name: 'Recipient', value: args.commentsId },
					{ name: 'Quantity', value: args.quantity },
					{ name: 'X-Tip-Receipt-Id', value: tipReceiptId },
				],
			});

			for (let i = 0; i < 6; i++) {
				const receipt = await aoDryRun(deps, {
					processId: args.commentsId,
					action: 'Get-Tip-Receipt',
					tags: [{ name: 'Tip-Receipt-Id', value: tipReceiptId }],
				});
				if (receipt && (receipt.id || receipt.Id)) break;
				await new Promise((r) => setTimeout(r, 400));
			}

			const createComment = createCommentWith(deps);
			const commentTxId = await createComment({
				commentsId: args.commentsId,
				creator: '',
				content: args.content,
				parentId: args.parentId,
				metadata: args.metadata,
				tipReceiptId,
			});

			return { tipTxId, tipReceiptId, commentTxId };
		} catch (e: any) {
			throw new Error(`Error at 'tipAndCreateCommentWith': ${e?.message ?? String(e)}`);
		}
	};
}
