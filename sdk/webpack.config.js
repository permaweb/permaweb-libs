const path = require('path');
const webpack = require('webpack');

module.exports = [
	{
		mode: 'production',
		entry: './src/index.ts',
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'bundle.js',
			library: {
				type: 'umd', // UMD output
				name: 'MySDK',
			},
			globalObject: 'this',
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					use: 'ts-loader',
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			extensions: ['.ts', '.js'],
		},
	},
	{
		mode: 'production',
		entry: './src/index.ts',
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'bundle.esm.js',
			library: {
				type: 'module', // ESM output
			},
		},
		experiments: {
			outputModule: true,
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					use: 'ts-loader',
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			extensions: ['.ts', '.js'],
			fallback: {
				process: require.resolve('process/browser'),
			},
			alias: {
				helpers: path.resolve(__dirname, 'src/helpers'),
				common: path.resolve(__dirname, 'src/common'),
				services: path.resolve(__dirname, 'src/services'),
			},
		},
		plugins: [
			new webpack.ProvidePlugin({
				process: 'process/browser',
			}),
		],
	},
];
