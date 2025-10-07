import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import esbuild from 'esbuild';
import alias from 'esbuild-plugin-alias';
import dtsPlugin from 'esbuild-plugin-d.ts';
import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill';
import path from 'path';

const sharedConfig = {
	entryPoints: ['src/index.ts'],
	bundle: true,
	sourcemap: false,
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
		external: ['fs', 'os', 'path', 'http', 'https', 'zlib'],
		plugins: [
			alias({
				'node:process': require.resolve('process/browser'),
			}),
			nodeModulesPolyfillPlugin({
				globals: { process: true, Buffer: true },
				modules: {
					crypto: true,
					stream: true,
					events: true,
					util: true,
					buffer: true,
				},
			}),
			dtsPlugin({ outDir: 'dist/types' }),
		],
	},
];

async function build() {
	try {
		for (let i = 0; i < buildConfigs.length; i++) {
			const cfg = buildConfigs[i];
			console.log(`Building configuration ${i + 1}: ${cfg.outfile}`);
			await esbuild.build(cfg);
			console.log(`Finished building configuration ${i + 1}: ${cfg.outfile}`);
		}
		console.log('Build complete!');
	} catch (err) {
		console.error('Build failed:', err);
		process.exit(1);
	}
}

build();
