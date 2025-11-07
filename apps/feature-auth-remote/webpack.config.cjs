const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const mfGenerated = require('../../tools/module-federation/generated/remote.webpack.config.cjs');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.js'),
  mode: 'development',
  // disable the eval devtool to avoid large eval()-wrapped files being served
  devtool: false, // keep this line to maintain the existing configuration
  output: {
    publicPath: 'auto',
  },
  devServer: {
    port: 3001,
    hot: true,
    static: {
      directory: path.resolve(__dirname, 'dist'),
      watch: {
        // ignore node_modules to reduce churn
        ignored: /node_modules/,
      },
    },
    // prevent webpack-dev-server from opening the browser and quiet client logs
    open: false,
    client: {
      logging: 'warn',
      overlay: false,
      progress: false,
    },
    devMiddleware: {
      // show only errors to reduce noise and avoid long buffering output
      stats: 'errors-only',
    },
  },
  plugins: [
    new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'public', 'index.html') }),
    // apply generated Module Federation plugin options
    ...mfGenerated.plugins,
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        type: 'javascript/auto',
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
};
