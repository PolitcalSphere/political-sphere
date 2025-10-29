// This file was an experimental ESM webpack config created by automation.
// The repository uses `apps/host/webpack.config.cjs` as the canonical config.
// Please use `apps/host/webpack.config.cjs` instead. This ESM variant is intentionally
// blank to avoid accidental usage during local development.

/* eslint-disable */
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import mfGenerated from '../../tools/module-federation/generated/host.webpack.config.js';

const root = process.cwd();

export default {
	entry: path.resolve(root, 'apps', 'host', 'src', 'index.js'),
	mode: 'development',
	devtool: false,
	output: { publicPath: 'auto' },
	devServer: {
		port: 3000,
		hot: true,
		static: { directory: path.resolve(root, 'apps', 'host', 'dist'), watch: { ignored: /node_modules/ } },
		open: false,
		client: { logging: 'warn', overlay: false, progress: false },
		devMiddleware: { stats: 'errors-only' }
	},
	plugins: [
		new HtmlWebpackPlugin({ template: path.resolve(root, 'apps', 'host', 'public', 'index.html') }),
		...(mfGenerated && mfGenerated.plugins ? mfGenerated.plugins : [])
	],
	module: { rules: [] },
	resolve: { extensions: ['.js'] }
};
