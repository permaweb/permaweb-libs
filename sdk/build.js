import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import esbuild from 'esbuild';
import alias from 'esbuild-plugin-alias';
import dtsPlugin from 'esbuild-plugin-d.ts';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';
import path from 'path';

const sharedConfig = {
	entryPoints: ['src/index.ts'],
	bundle: true,
	sourcemap: true,
	minify: true,
	inject: [path.resolve('node_modules/process/browser.js')],
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
	},
};

const buildConfigs = [
	{
		...sharedConfig,
		outfile: 'dist/index.cjs',
		platform: 'node',
		format: 'cjs',
		plugins: [dtsPlugin({ outDir: 'dist/types' })],
	},
	{
		...sharedConfig,
		outfile: 'dist/index.js',
		platform: 'node',
		format: 'esm',
		plugins: [dtsPlugin({ outDir: 'dist/types' })],
	},
	{
		...sharedConfig,
		outfile: 'dist/index.esm.js',
		platform: 'browser',
		format: 'esm',
		external: ['fs', 'crypto', 'os', 'stream', 'util', 'node:buffer', 'node:stream', 'zlib', 'http', 'https', 'path'],
		plugins: [
			alias({
				crypto: require.resolve('crypto-browserify'),
				stream: require.resolve('stream-browserify'),
				os: require.resolve('os-browserify/browser')
			}),
			polyfillNode(),
			dtsPlugin({ outDir: 'dist/types' })
		],
	},
];
async function build() {
	try {
		await Promise.all(buildConfigs.map(async (config, index) => {
			console.log(`Building configuration ${index + 1}:`, config.outfile);
			await esbuild.build(config);
			console.log(`Finished building configuration ${index + 1}:`, config.outfile);
		}));
		console.log('Build complete!');
	} catch (error) {
		console.error('Build failed:', error);
		process.exit(1);
	}
}

build();
