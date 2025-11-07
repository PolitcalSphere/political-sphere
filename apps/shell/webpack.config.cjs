const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const mfGenerated = require('../../tools/module-federation/generated/host.webpack.config.cjs');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.js'),
  mode: 'development',
  // avoid eval() devtool which produces large wrapped output that looks like buffering
  devtool: false,
  output: {
    publicPath: 'auto',
  },
  devServer: {
    port: 3000,
    hot: true,
    static: {
      directory: path.resolve(__dirname, 'dist'),
      watch: { ignored: /node_modules/ },
    },
    open: false,
    client: { logging: 'warn', overlay: false, progress: false },
    devMiddleware: { stats: 'errors-only' },
  },
  plugins: [
    new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'public', 'index.html') }),
    // merge in the generated Module Federation plugin
    ...mfGenerated.plugins.map((p) => p),
  ],
  module: {
    rules: [],
  },
  resolve: {
    extensions: ['.js'],
  },
};
