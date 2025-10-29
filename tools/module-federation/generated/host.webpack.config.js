// Host webpack config (Module Federation) example (ESM)
import webpack from 'webpack';
const { ModuleFederationPlugin } = webpack.container;

export default {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        remoteApp: 'remoteApp@http://localhost:3001/remoteEntry.js'
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } }
    })
  ]
};
