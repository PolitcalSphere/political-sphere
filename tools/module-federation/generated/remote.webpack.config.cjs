// Remote webpack config (Module Federation) example (CommonJS)
const path = require('path');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      // expose absolute path to ensure resolution from generated config into the remote app's source
      exposes: {
        './Widget': path.resolve(process.cwd(), 'apps/remote/src/bootstrap.js')
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } }
    })
  ]
};
