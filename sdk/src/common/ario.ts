import { DependencyType } from 'helpers/types.ts';

export function getPrimaryNameWith(deps: DependencyType) {
	return async (address: string): Promise<string> => {
		try {
			const { name } = await deps.ario.getPrimaryName({
				address,
			});
			return name;
		} catch (error: any) {
			console.error(error.message ?? `Error fetching ArNS primary name for ${address}`);
			return '';
		}
	};
}
