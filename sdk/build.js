import esbuild from 'esbuild';

const sharedConfig = {
  entryPoints: ['src/index.ts'],    // Entry file for the SDK
  bundle: true,                     // Bundle all dependencies
  sourcemap: true,                  // Generate source maps
  minify: true,                     // Minify the output for production
};

const buildConfigs = [
  // Node.js (CJS)
  {
    ...sharedConfig,
    outfile: 'dist/index.cjs.js',
    platform: 'node',              // Node.js environment
    format: 'cjs',                 // CommonJS format
  },
  // Browser (ESM)
  {
    ...sharedConfig,
    outfile: 'dist/index.esm.js',
    platform: 'browser',           // Browser environment
    format: 'esm',                 // ES Module format
  },
];

async function build() {
  try {
    await Promise.all(buildConfigs.map(config => esbuild.build(config)));
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
