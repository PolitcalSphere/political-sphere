// This file was an experimental ESM webpack config created by automation.
// The repository uses `apps/remote/webpack.config.cjs` as the canonical config.
// Please use `apps/remote/webpack.config.cjs` instead. This ESM variant is intentionally
// blank to avoid accidental usage during local development.

/* eslint-disable */
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';
import mfGenerated from '../../tools/module-federation/generated/remote.webpack.config.js';

// Use process.cwd() so paths are deterministic in CI and avoid URL percent-encoding
const root = process.cwd();

export default {
  entry: path.resolve(root, 'apps', 'remote', 'src', 'index.js'),
  mode: 'development',
  devtool: false,
  output: { publicPath: 'auto' },
  devServer: {
    port: 3001,
    hot: true,
    static: {
      directory: path.resolve(root, 'apps', 'remote', 'dist'),
      watch: { ignored: /node_modules/ },
    },
    open: false,
    client: { logging: 'warn', overlay: false, progress: false },
    devMiddleware: { stats: 'errors-only' },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(root, 'apps', 'remote', 'public', 'index.html'),
    }),
    // merge in generated Module Federation plugin(s)
    ...(mfGenerated && mfGenerated.plugins ? mfGenerated.plugins : []),
  ],
  module: { rules: [{ test: /\\.m?js$/, type: 'javascript/auto' }] },
  resolve: { extensions: ['.js'] },
};
