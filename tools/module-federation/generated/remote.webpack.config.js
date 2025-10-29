// Remote webpack config (Module Federation) example (ESM)
import path from 'path';
import webpack from 'webpack';
const { ModuleFederationPlugin } = webpack.container;

export default {
  plugins: [
    new ModuleFederationPlugin({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Widget': path.resolve(process.cwd(), 'apps/remote/src/bootstrap.js')
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } }
    })
  ]
};
