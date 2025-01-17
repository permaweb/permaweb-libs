import esbuild from 'esbuild';
import dtsPlugin from 'esbuild-plugin-d.ts';
import path from 'path';

const sharedConfig = {
	entryPoints: ['src/index.ts'],
	bundle: true,
	sourcemap: true,
	minify: true,
	inject: [path.resolve('node_modules/process/browser.js')], // Explicitly inject the process polyfill
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
	},
};

const buildConfigs = [
	// Node.js (CJS)
	{
		...sharedConfig,
		outfile: 'dist/index.cjs',
		platform: 'node',
		format: 'cjs',
		plugins: [dtsPlugin({ outDir: 'dist/types' })],
	},
	// Node.js (ESM)
	{
		...sharedConfig,
		outfile: 'dist/index.js',
		platform: 'node',
		format: 'esm',
		plugins: [dtsPlugin({ outDir: 'dist/types' })],
	},
	// Browser (ESM)
	{
		...sharedConfig,
		outfile: 'dist/index.esm.js',
		platform: 'browser',
		format: 'esm',
		plugins: [dtsPlugin({ outDir: 'dist/types' })],
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
