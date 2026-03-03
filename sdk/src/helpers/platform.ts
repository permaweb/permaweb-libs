/**
 * Platform abstraction interfaces for cross-platform compatibility
 * Supports Browser, Node.js, and React Native environments
 */

import { TagType } from './types.ts';

// ============================================================================
// Wallet Provider Interface
// ============================================================================

export interface WalletProvider {
	/**
	 * Dispatch a transaction to the wallet for signing and submission
	 */
	dispatch(tx: any): Promise<{ id: string }>;

	/**
	 * Sign arbitrary data
	 */
	sign(data: Uint8Array): Promise<Uint8Array>;

	/**
	 * Get the active public key
	 */
	getActivePublicKey(): Promise<string>;

	/**
	 * Get wallet address
	 */
	getAddress(): Promise<string>;

	/**
	 * Check if wallet is connected
	 */
	isConnected(): Promise<boolean>;
}

// ============================================================================
// File Handler Interface
// ============================================================================

export interface FileInput {
	data: Uint8Array | ArrayBuffer | string; // base64 or raw data
	type?: string; // MIME type
	size?: number;
	name?: string;
}

export interface FileHandler {
	/**
	 * Read file as ArrayBuffer
	 */
	readAsArrayBuffer(file: any): Promise<ArrayBuffer>;

	/**
	 * Get content type of file
	 */
	getContentType(file: any): string;

	/**
	 * Get size of file in bytes
	 */
	getSize(file: any): number;

	/**
	 * Create a file-like object from data
	 */
	createFile(data: Uint8Array | ArrayBuffer | string, type?: string, name?: string): FileInput;

	/**
	 * Check if input is a file
	 */
	isFile(input: any): boolean;
}

// ============================================================================
// Blob Handler Interface
// ============================================================================

export interface BlobHandler {
	/**
	 * Create a blob from data
	 */
	createBlob(data: Uint8Array | ArrayBuffer, type?: string): any;

	/**
	 * Read blob as ArrayBuffer
	 */
	readAsArrayBuffer(blob: any): Promise<ArrayBuffer>;

	/**
	 * Slice a blob
	 */
	slice(blob: any, start: number, end: number): any;

	/**
	 * Get blob size
	 */
	getSize(blob: any): number;
}

// ============================================================================
// Crypto Provider Interface
// ============================================================================

export interface CryptoProvider {
	/**
	 * Generate a random UUID v4
	 */
	randomUUID(): string;

	/**
	 * Fill array with cryptographically secure random values
	 */
	getRandomValues<T extends Uint8Array>(array: T): T;

	/**
	 * Generate random bytes
	 */
	randomBytes(size: number): Uint8Array;
}

// ============================================================================
// Storage Provider Interface
// ============================================================================

export interface StorageProvider {
	/**
	 * Get item from storage
	 */
	getItem(key: string): Promise<string | null>;

	/**
	 * Set item in storage
	 */
	setItem(key: string, value: string): Promise<void>;

	/**
	 * Remove item from storage
	 */
	removeItem(key: string): Promise<void>;

	/**
	 * Clear all storage
	 */
	clear(): Promise<void>;
}

// ============================================================================
// Secure Storage Provider Interface (for keys/secrets)
// ============================================================================

export interface SecureStorageProvider {
	/**
	 * Securely store a value
	 */
	setSecure(key: string, value: string): Promise<void>;

	/**
	 * Retrieve securely stored value
	 */
	getSecure(key: string): Promise<string | null>;

	/**
	 * Delete securely stored value
	 */
	deleteSecure(key: string): Promise<void>;
}

// ============================================================================
// Base64 Encoder Interface
// ============================================================================

export interface Base64Handler {
	/**
	 * Encode data to base64
	 */
	encode(data: Uint8Array | ArrayBuffer | string): string;

	/**
	 * Decode base64 to Uint8Array
	 */
	decode(base64: string): Uint8Array;

	/**
	 * Encode string to base64 (btoa equivalent)
	 */
	btoa(str: string): string;

	/**
	 * Decode base64 to string (atob equivalent)
	 */
	atob(base64: string): string;
}

// ============================================================================
// Platform Context
// ============================================================================

export interface PlatformContext {
	wallet?: WalletProvider;
	file: FileHandler;
	blob: BlobHandler;
	crypto: CryptoProvider;
	storage?: StorageProvider;
	secureStorage?: SecureStorageProvider;
	base64: Base64Handler;
}

// ============================================================================
// Platform Detection
// ============================================================================

export type PlatformType = 'browser' | 'node' | 'react-native';

export function detectPlatform(): PlatformType {
	// Check for React Native
	if (
		typeof navigator !== 'undefined' &&
		typeof navigator.product === 'string' &&
		navigator.product.toLowerCase() === 'reactnative'
	) {
		return 'react-native';
	}

	// Check for browser
	if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
		return 'browser';
	}

	// Default to Node.js
	return 'node';
}

// ============================================================================
// Extended Dependency Type (backward compatible)
// ============================================================================

export type PlatformDependencyType = {
	ao: any;
	signer?: any;
	arweave?: any;
	node?: { url: string; scheduler: string; authority: string };
	platform?: PlatformContext;
};
