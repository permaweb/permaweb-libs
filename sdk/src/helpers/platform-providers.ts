/**
 * Platform-specific provider implementations
 * Auto-detects platform and provides appropriate implementations
 */

import type {
	Base64Handler,
	BlobHandler,
	CryptoProvider,
	FileHandler,
	FileInput,
	PlatformContext,
	StorageProvider,
	WalletProvider,
} from './platform.ts';
import { detectPlatform } from './platform.ts';
import { globalLog } from './utils.ts';

// ============================================================================
// Browser Implementations
// ============================================================================

class BrowserWalletProvider implements WalletProvider {
	async dispatch(tx: any): Promise<{ id: string }> {
		if (typeof window === 'undefined' || !(window as any).arweaveWallet) {
			throw new Error('ArConnect wallet not found');
		}
		return (window as any).arweaveWallet.dispatch(tx);
	}

	async sign(data: Uint8Array): Promise<Uint8Array> {
		if (typeof window === 'undefined' || !(window as any).arweaveWallet) {
			throw new Error('ArConnect wallet not found');
		}
		const signature = await (window as any).arweaveWallet.signature(data, {
			name: 'RSA-PSS',
			saltLength: 32,
		});
		return new Uint8Array(signature);
	}

	async getActivePublicKey(): Promise<string> {
		if (typeof window === 'undefined' || !(window as any).arweaveWallet) {
			throw new Error('ArConnect wallet not found');
		}
		return (window as any).arweaveWallet.getActivePublicKey();
	}

	async getAddress(): Promise<string> {
		if (typeof window === 'undefined' || !(window as any).arweaveWallet) {
			throw new Error('ArConnect wallet not found');
		}
		return (window as any).arweaveWallet.getActiveAddress();
	}

	async isConnected(): Promise<boolean> {
		return typeof window !== 'undefined' && !!(window as any).arweaveWallet;
	}
}

class BrowserFileHandler implements FileHandler {
	async readAsArrayBuffer(file: any): Promise<ArrayBuffer> {
		if (file instanceof File) {
			return await file.arrayBuffer();
		}
		if (file instanceof ArrayBuffer) {
			return file;
		}
		if (file instanceof Uint8Array) {
			return file.buffer.slice(0) as ArrayBuffer;
		}
		if (typeof file === 'string') {
			// Assume base64
			const binary = atob(file);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
			return bytes.buffer.slice(0) as ArrayBuffer;
		}
		throw new Error('Unsupported file type');
	}

	getContentType(file: any): string {
		if (file instanceof File) {
			return file.type;
		}
		return 'application/octet-stream';
	}

	getSize(file: any): number {
		if (file instanceof File) {
			return file.size;
		}
		if (file instanceof ArrayBuffer) {
			return file.byteLength;
		}
		if (file instanceof Uint8Array) {
			return file.byteLength;
		}
		return 0;
	}

	createFile(data: Uint8Array | ArrayBuffer | string, type?: string, name?: string): FileInput {
		let bytes: Uint8Array;
		if (data instanceof Uint8Array) {
			bytes = data;
		} else if (data instanceof ArrayBuffer) {
			bytes = new Uint8Array(data);
		} else {
			// Assume base64
			const binary = atob(data);
			bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
		}
		return {
			data: bytes,
			type: type || 'application/octet-stream',
			size: bytes.byteLength,
			name: name || 'file',
		};
	}

	isFile(input: any): boolean {
		return input instanceof File;
	}
}

class BrowserBlobHandler implements BlobHandler {
	createBlob(data: Uint8Array | ArrayBuffer, type?: string): any {
		const blobData = data instanceof Uint8Array ? data : new Uint8Array(data);
		return new Blob([blobData as any], { type: type || 'application/octet-stream' });
	}

	async readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
		return await blob.arrayBuffer();
	}

	slice(blob: Blob, start: number, end: number): Blob {
		return blob.slice(start, end);
	}

	getSize(blob: Blob): number {
		return blob.size;
	}
}

class BrowserCryptoProvider implements CryptoProvider {
	randomUUID(): string {
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		// Fallback implementation
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	getRandomValues<T extends Uint8Array>(array: T): T {
		return crypto.getRandomValues(array);
	}

	randomBytes(size: number): Uint8Array {
		const bytes = new Uint8Array(size);
		return this.getRandomValues(bytes);
	}
}

class BrowserStorageProvider implements StorageProvider {
	async getItem(key: string): Promise<string | null> {
		return localStorage.getItem(key);
	}

	async setItem(key: string, value: string): Promise<void> {
		localStorage.setItem(key, value);
	}

	async removeItem(key: string): Promise<void> {
		localStorage.removeItem(key);
	}

	async clear(): Promise<void> {
		localStorage.clear();
	}
}

class BrowserBase64Handler implements Base64Handler {
	encode(data: Uint8Array | ArrayBuffer | string): string {
		if (typeof data === 'string') {
			return btoa(data);
		}
		const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
		return btoa(String.fromCharCode(...Array.from(bytes)));
	}

	decode(base64: string): Uint8Array {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}

	btoa(str: string): string {
		return btoa(str);
	}

	atob(base64: string): string {
		return atob(base64);
	}
}

// ============================================================================
// React Native Placeholder Implementations
// ============================================================================
// These will throw errors with helpful messages until actual RN implementation is provided

class ReactNativeWalletProvider implements WalletProvider {
	async dispatch(_tx: any): Promise<{ id: string }> {
		throw new Error(
			'React Native wallet provider not configured. Please provide a custom WalletProvider implementation.',
		);
	}

	async sign(_data: Uint8Array): Promise<Uint8Array> {
		throw new Error(
			'React Native wallet provider not configured. Please provide a custom WalletProvider implementation.',
		);
	}

	async getActivePublicKey(): Promise<string> {
		throw new Error(
			'React Native wallet provider not configured. Please provide a custom WalletProvider implementation.',
		);
	}

	async getAddress(): Promise<string> {
		throw new Error(
			'React Native wallet provider not configured. Please provide a custom WalletProvider implementation.',
		);
	}

	async isConnected(): Promise<boolean> {
		return false;
	}
}

class ReactNativeFileHandler implements FileHandler {
	async readAsArrayBuffer(file: any): Promise<ArrayBuffer> {
		// Support base64 strings, Uint8Array, and ArrayBuffer
		if (file instanceof ArrayBuffer) {
			return file;
		}
		if (file instanceof Uint8Array) {
			return file.buffer.slice(0) as ArrayBuffer;
		}
		if (typeof file === 'string') {
			// Assume base64
			const decoded = this.base64ToUint8Array(file);
			return decoded.buffer.slice(0) as ArrayBuffer;
		}
		if (file?.data) {
			// FileInput format
			return this.readAsArrayBuffer(file.data);
		}
		throw new Error('Unsupported file type for React Native');
	}

	getContentType(file: any): string {
		if (file?.type) return file.type;
		return 'application/octet-stream';
	}

	getSize(file: any): number {
		if (file?.size) return file.size;
		if (file instanceof ArrayBuffer) return file.byteLength;
		if (file instanceof Uint8Array) return file.byteLength;
		if (file?.data) return this.getSize(file.data);
		return 0;
	}

	createFile(data: Uint8Array | ArrayBuffer | string, type?: string, name?: string): FileInput {
		let bytes: Uint8Array;
		if (data instanceof Uint8Array) {
			bytes = data;
		} else if (data instanceof ArrayBuffer) {
			bytes = new Uint8Array(data);
		} else {
			bytes = this.base64ToUint8Array(data);
		}
		return {
			data: bytes,
			type: type || 'application/octet-stream',
			size: bytes.byteLength,
			name: name || 'file',
		};
	}

	isFile(input: any): boolean {
		return input?.data !== undefined && input?.type !== undefined;
	}

	private base64ToUint8Array(base64: string): Uint8Array {
		// Remove data URL prefix if present
		const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
		const binaryString = this.atobPolyfill(base64Data);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes;
	}

	private atobPolyfill(base64: string): string {
		// Basic atob polyfill for React Native
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		let str = '';
		let i = 0;

		base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

		while (i < base64.length) {
			const enc1 = chars.indexOf(base64.charAt(i++));
			const enc2 = chars.indexOf(base64.charAt(i++));
			const enc3 = chars.indexOf(base64.charAt(i++));
			const enc4 = chars.indexOf(base64.charAt(i++));

			const chr1 = (enc1 << 2) | (enc2 >> 4);
			const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			const chr3 = ((enc3 & 3) << 6) | enc4;

			str += String.fromCharCode(chr1);
			if (enc3 !== 64) str += String.fromCharCode(chr2);
			if (enc4 !== 64) str += String.fromCharCode(chr3);
		}

		return str;
	}
}

class ReactNativeBlobHandler implements BlobHandler {
	createBlob(data: Uint8Array | ArrayBuffer, _type?: string): any {
		// In React Native, we just return the data as-is
		// The consumer will handle it appropriately
		return data instanceof Uint8Array ? data : new Uint8Array(data);
	}

	async readAsArrayBuffer(blob: any): Promise<ArrayBuffer> {
		if (blob instanceof ArrayBuffer) return blob;
		if (blob instanceof Uint8Array) return blob.buffer.slice(0) as ArrayBuffer;
		throw new Error('Unsupported blob type for React Native');
	}

	slice(blob: any, start: number, end: number): any {
		if (blob instanceof Uint8Array) {
			return blob.slice(start, end);
		}
		if (blob instanceof ArrayBuffer) {
			return blob.slice(start, end);
		}
		throw new Error('Unsupported blob type for slicing');
	}

	getSize(blob: any): number {
		if (blob instanceof Uint8Array) return blob.byteLength;
		if (blob instanceof ArrayBuffer) return blob.byteLength;
		return 0;
	}
}

class ReactNativeCryptoProvider implements CryptoProvider {
	randomUUID(): string {
		// This requires 'react-native-get-random-values' to be imported at app level
		// or we use a simple UUID v4 generator
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	getRandomValues<T extends Uint8Array>(array: T): T {
		// Requires 'react-native-get-random-values' polyfill
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			return crypto.getRandomValues(array);
		}
		// Fallback to Math.random (NOT cryptographically secure)
		for (let i = 0; i < array.length; i++) {
			array[i] = Math.floor(Math.random() * 256);
		}
		return array;
	}

	randomBytes(size: number): Uint8Array {
		const bytes = new Uint8Array(size);
		return this.getRandomValues(bytes);
	}
}

class ReactNativeStorageProvider implements StorageProvider {
	private cache: Map<string, string> = new Map();

	async getItem(key: string): Promise<string | null> {
		// This should be replaced with AsyncStorage from @react-native-async-storage/async-storage
		return this.cache.get(key) || null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.cache.set(key, value);
	}

	async removeItem(key: string): Promise<void> {
		this.cache.delete(key);
	}

	async clear(): Promise<void> {
		this.cache.clear();
	}
}

class ReactNativeBase64Handler implements Base64Handler {
	encode(data: Uint8Array | ArrayBuffer | string): string {
		if (typeof data === 'string') {
			return this.btoaPolyfill(data);
		}
		const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
		return this.btoaPolyfill(String.fromCharCode(...Array.from(bytes)));
	}

	decode(base64: string): Uint8Array {
		const binary = this.atobPolyfill(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}

	btoa(str: string): string {
		return this.btoaPolyfill(str);
	}

	atob(base64: string): string {
		return this.atobPolyfill(base64);
	}

	private btoaPolyfill(str: string): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		let output = '';
		let i = 0;

		while (i < str.length) {
			const chr1 = str.charCodeAt(i++);
			const chr2 = i < str.length ? str.charCodeAt(i++) : NaN;
			const chr3 = i < str.length ? str.charCodeAt(i++) : NaN;

			const enc1 = chr1 >> 2;
			const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			const enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				output += chars.charAt(enc1) + chars.charAt(enc2) + '==';
			} else if (isNaN(chr3)) {
				output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + '=';
			} else {
				output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
			}
		}

		return output;
	}

	private atobPolyfill(base64: string): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		let str = '';
		let i = 0;

		base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

		while (i < base64.length) {
			const enc1 = chars.indexOf(base64.charAt(i++));
			const enc2 = chars.indexOf(base64.charAt(i++));
			const enc3 = chars.indexOf(base64.charAt(i++));
			const enc4 = chars.indexOf(base64.charAt(i++));

			const chr1 = (enc1 << 2) | (enc2 >> 4);
			const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			const chr3 = ((enc3 & 3) << 6) | enc4;

			str += String.fromCharCode(chr1);
			if (enc3 !== 64) str += String.fromCharCode(chr2);
			if (enc4 !== 64) str += String.fromCharCode(chr3);
		}

		return str;
	}
}

// ============================================================================
// Platform Context Factory
// ============================================================================

export function createPlatformContext(customProviders?: Partial<PlatformContext>): PlatformContext {
	const platform = detectPlatform();

	globalLog(`Platform detected: ${platform}`);

	let defaultContext: PlatformContext;

	switch (platform) {
		case 'browser':
			globalLog('Initializing browser providers (ArConnect, File API, Blob API, Web Crypto)');
			defaultContext = {
				wallet: new BrowserWalletProvider(),
				file: new BrowserFileHandler(),
				blob: new BrowserBlobHandler(),
				crypto: new BrowserCryptoProvider(),
				storage: new BrowserStorageProvider(),
				base64: new BrowserBase64Handler(),
			};
			break;

		case 'react-native':
			globalLog('Initializing React Native providers (custom wallet required, polyfills active)');
			defaultContext = {
				wallet: new ReactNativeWalletProvider(),
				file: new ReactNativeFileHandler(),
				blob: new ReactNativeBlobHandler(),
				crypto: new ReactNativeCryptoProvider(),
				storage: new ReactNativeStorageProvider(),
				base64: new ReactNativeBase64Handler(),
			};
			break;

		case 'node':
		default:
			globalLog('Initializing Node.js providers (limited wallet support)');
			// Node.js implementation would go here
			// For now, use browser implementations as they're mostly compatible
			defaultContext = {
				file: new BrowserFileHandler(),
				blob: new BrowserBlobHandler(),
				crypto: new BrowserCryptoProvider(),
				base64: new BrowserBase64Handler(),
			};
			break;
	}

	// Log custom provider overrides
	if (customProviders) {
		const overrides = Object.keys(customProviders).filter(key => customProviders[key as keyof PlatformContext]);
		if (overrides.length > 0) {
			globalLog(`Custom providers: ${overrides.join(', ')}`);
		}
	}

	// Merge custom providers
	return {
		...defaultContext,
		...customProviders,
	};
}

// Export all providers for custom usage
export {
	BrowserBase64Handler,
	BrowserBlobHandler,
	BrowserCryptoProvider,
	BrowserFileHandler,
	BrowserStorageProvider,
	BrowserWalletProvider,
	detectPlatform,
	ReactNativeBase64Handler,
	ReactNativeBlobHandler,
	ReactNativeCryptoProvider,
	ReactNativeFileHandler,
	ReactNativeStorageProvider,
	ReactNativeWalletProvider,
};
