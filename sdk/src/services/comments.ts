import { aoSend, readProcess } from '../common/ao.ts';
import { CommentCreateArgType, DependencyType } from '../helpers/types.ts';
import { mapFromProcessCase } from '../helpers/utils.ts';

export function createCommentWith(deps: DependencyType) {
	return async (args: CommentCreateArgType) => {
		try {
			if (!args.commentsId) throw new Error('Must provide commentsId');

			const commentsUpdateId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Add-Comment',
				data: args.content,
				useRawData: true
			});

			return commentsUpdateId;
		}
		catch (e: any) {
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
				})
			);

			return comments;
		}
		catch (e: any) {
			throw new Error(e.message ?? 'Error getting comments');
		}
	};
}

export function updateCommentStatusWith(deps: DependencyType) {
	return async (args: { commentsId: string, commentId: string, status: 'active' | 'inactive' }) => {
		try {
			if (!args.commentsId) throw new Error(`Must provide commentsId`);
			if (!args.commentId) throw new Error(`Must provide commentId`);

			const commentUpdateId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Update-Comment-Status',
				tags: [
					{ name: 'Comment-Id', value: args.commentId },
					{ name: 'Status', value: args.status }
				]
			});

			return commentUpdateId;
		}
		catch (e: any) {
			throw new Error(e.message ?? 'Error updating comment status');
		}
	};
}

export function removeCommentWith(deps: DependencyType) {
	return async (args: { commentsId: string, commentId: string, status: 'active' | 'inactive' }) => {
		try {
			if (!args.commentsId) throw new Error(`Must provide commentsId`);
			if (!args.commentId) throw new Error(`Must provide commentId`);

			const commentRemoveId = await aoSend(deps, {
				processId: args.commentsId,
				action: 'Remove-Comment',
				tags: [{ name: 'Comment-Id', value: args.commentId }]
			});

			return commentRemoveId;
		}
		catch (e: any) {
			throw new Error(e.message ?? 'Error removing comment');
		}
	};
}