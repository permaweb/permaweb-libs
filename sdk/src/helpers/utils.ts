import { TAGS } from './config.ts';

declare const InstallTrigger: any;

export function checkValidAddress(address: string | null) {
	if (!address) return false;
	return /^[a-z0-9_-]{43}$/i.test(address);
}

export function formatAddress(address: string | null, wrap: boolean) {
	if (!address) return '';
	if (!checkValidAddress(address)) return address;
	const formattedAddress = address.substring(0, 5) + '...' + address.substring(36, address.length);
	return wrap ? `(${formattedAddress})` : formattedAddress;
}

export function getTagValue(list: { [key: string]: any }[], name: string): string | null {
	for (let i = 0; i < list.length; i++) {
		if (list[i]) {
			if (list[i]!.name === name) {
				return list[i]!.value as string;
			}
		}
	}
	return null;
}

export function formatCount(count: string): string {
	if (count === '0' || !Number(count)) return '0';

	if (count.includes('.')) {
		let parts = count.split('.');
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

		// Find the position of the last non-zero digit within the first 6 decimal places
		let index = 0;
		for (let i = 0; i < Math.min(parts[1].length, 6); i++) {
			if (parts[1][i] !== '0') {
				index = i + 1;
			}
		}

		if (index === 0) {
			// If all decimals are zeros, keep two decimal places
			parts[1] = '00';
		} else {
			// Otherwise, truncate to the last non-zero digit
			parts[1] = parts[1].substring(0, index);

			// If the decimal part is longer than 4 digits, truncate to 4 digits
			if (parts[1].length > 4 && parts[1].substring(0, 4) !== '0000') {
				parts[1] = parts[1].substring(0, 4);
			}
		}

		return parts.join('.');
	} else {
		return count.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	}
}

export function formatPercentage(percentage: any) {
	if (isNaN(percentage)) return '0%';

	let multiplied = percentage * 100;
	let decimalPart = multiplied.toString().split('.')[1];

	if (!decimalPart) {
		return `${multiplied.toFixed(0)}%`;
	}

	if (decimalPart.length > 6 && decimalPart.substring(0, 6) === '000000') {
		return `${multiplied.toFixed(0)}%`;
	}

	let nonZeroIndex = decimalPart.length;
	for (let i = 0; i < decimalPart.length; i++) {
		if (decimalPart[i] !== '0') {
			nonZeroIndex = i + 1;
			break;
		}
	}

	return `${multiplied.toFixed(nonZeroIndex)}%`;
}

export function formatDate(dateArg: string | number | null, dateType: 'iso' | 'epoch', fullTime?: boolean) {
	if (!dateArg) {
		return null;
	}

	let date: Date | null = null;

	switch (dateType) {
		case 'iso':
			date = new Date(dateArg);
			break;
		case 'epoch':
			date = new Date(Number(dateArg));
			break;
		default:
			date = new Date(dateArg);
			break;
	}

	return fullTime
		? `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}, ${date.getUTCFullYear()} at ${
				date.getHours() % 12 || 12
			}:${date.getMinutes().toString().padStart(2, '0')} ${date.getHours() >= 12 ? 'PM' : 'AM'}`
		: `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}, ${date.getUTCFullYear()}`;
}

export function getRelativeDate(timestamp: number) {
	if (!timestamp) return '-';
	const currentDate = new Date();
	const inputDate = new Date(timestamp);

	const timeDifference: number = currentDate.getTime() - inputDate.getTime();
	const secondsDifference = Math.floor(timeDifference / 1000);
	const minutesDifference = Math.floor(secondsDifference / 60);
	const hoursDifference = Math.floor(minutesDifference / 60);
	const daysDifference = Math.floor(hoursDifference / 24);
	const monthsDifference = Math.floor(daysDifference / 30.44); // Average days in a month
	const yearsDifference = Math.floor(monthsDifference / 12);

	if (yearsDifference > 0) {
		return `${yearsDifference} year${yearsDifference > 1 ? 's' : ''} ago`;
	} else if (monthsDifference > 0) {
		return `${monthsDifference} month${monthsDifference > 1 ? 's' : ''} ago`;
	} else if (daysDifference > 0) {
		return `${daysDifference} day${daysDifference > 1 ? 's' : ''} ago`;
	} else if (hoursDifference > 0) {
		return `${hoursDifference} hour${hoursDifference > 1 ? 's' : ''} ago`;
	} else if (minutesDifference > 0) {
		return `${minutesDifference} minute${minutesDifference > 1 ? 's' : ''} ago`;
	} else {
		return `${secondsDifference} second${secondsDifference !== 1 ? 's' : ''} ago`;
	}
}

export function formatRequiredField(field: string) {
	return `${field} *`;
}

export function splitTagValue(tag: any) {
	let parts = tag.split('-');

	let lastPart = parts[parts.length - 1];
	if (!isNaN(lastPart)) {
		parts = parts.slice(0, -1).join(' ') + ': ' + lastPart;
	} else {
		parts = parts.join(' ');
	}

	return parts;
}

export function getTagDisplay(value: string) {
	let result = value.replace(/([A-Z])/g, ' $1').trim();
	result = result.charAt(0).toUpperCase() + result.slice(1);
	return result;
}

export function getDataURLContentType(dataURL: string) {
	const result = dataURL.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
	return result ? result[1] : null;
}

export function getBase64Data(dataURL: string) {
	return dataURL.split(',')[1];
}

export function getByteSize(input: string | Buffer): number {
	let sizeInBytes: number;
	if (Buffer.isBuffer(input)) {
		sizeInBytes = input.length;
	} else if (typeof input === 'string') {
		sizeInBytes = Buffer.byteLength(input, 'utf-8');
	} else {
		throw new Error('Input must be a string or a Buffer');
	}

	return sizeInBytes;
}

export function getTotalTokenBalance(tokenBalances: { profileBalance: number; walletBalance: number } | null) {
	if (!tokenBalances) return null;
	const total = (tokenBalances.profileBalance || 0) + (tokenBalances.walletBalance || 0);
	return total;
}

export function isFirefox(): boolean {
	return typeof InstallTrigger !== 'undefined';
}

export function reverseDenomination(number: number) {
	let count = 0;

	while (number > 0 && number % 10 === 0) {
		count++;
		number /= 10;
	}

	return count;
}

export function cleanProcessField(value: string) {
	let updatedValue: string;
	updatedValue = value.replace(/\[|\]/g, '');
	return `[[${updatedValue}]]`;
}

export function cleanTagValue(value: string) {
	let updatedValue: string;
	updatedValue = value.replace(/\[|\]/g, '');
	return updatedValue;
}

/**
 * Extracts all values from a key-value store that match a given prefix
 * @param store The key-value store object to search
 * @param prefix The prefix to filter keys by (e.g., 'portal')
 * @returns Array of values whose keys match the prefix
 */
export function getStoreNamespace<T = any>(prefix: string, store: Record<string, T>): T[] {
	if (!store) return [];

	const searchPrefix = `${prefix}:`;
	return Object.keys(store)
		.filter((key) => key.startsWith(searchPrefix))
		.map((key) => store[key]) as any;
}

export function buildStoreNamespace(prefix: string, value: string) {
	return `${prefix}:${value.toLowerCase().replace(/\s+/g, '-')}`;
}

export const globalLog = (...args: any[]) => {
	console.log('[@permaweb/libs]', ...args);
};

function toProcessCase(str: string): string {
	return str.replace(/^[a-z]/, (match) => match.toUpperCase());
}

/* Maps an object from camel case to pascal case */
export function mapToProcessCase(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(mapToProcessCase);
	} else if (obj && typeof obj === 'object') {
		return Object.entries(obj).reduce((acc: any, [key, value]) => {
			const toKey = toProcessCase(key);
			acc[toKey] = checkValidAddress(value as any) ? value : mapToProcessCase(value);
			return acc;
		}, {});
	}
	return obj;
}

function fromProcessCase(str: string) {
	return str.charAt(0).toLowerCase() + str.slice(1);
}

/* Maps an object from pascal case to camel case */
export function mapFromProcessCase(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(mapFromProcessCase);
	} else if (obj && typeof obj === 'object') {
		return Object.entries(obj).reduce((acc: any, [key, value]) => {
			const fromKey = checkValidAddress(key as any) || key.includes('-') ? key : fromProcessCase(key);
			acc[fromKey] = checkValidAddress(value as any) ? value : mapFromProcessCase(value);
			return acc;
		}, {});
	}
	return obj;
}

export function getBootTag(key: string, value: string) {
	const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
	return { name: `${TAGS.keys.bootloader}-${capitalizedKey}`, value };
}

export function isValidMediaData(data: any) {
	return checkValidAddress(data) || data.startsWith('data')
}