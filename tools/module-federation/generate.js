#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'tools', 'module-federation', 'generated');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const host = `// Host webpack config (Module Federation) example
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        remoteApp: 'remoteApp@http://localhost:4201/remoteEntry.js'
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } }
    })
  ]
};
`;

const remote = `// Remote webpack config (Module Federation) example
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Widget': './src/bootstrap'
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } }
    })
  ]
};
`;

fs.writeFileSync(path.join(outDir, 'host.webpack.config.js'), host);
fs.writeFileSync(path.join(outDir, 'remote.webpack.config.js'), remote);

console.log('Module Federation starter files written to', outDir);

console.log('Next steps:\n  - Copy these configs into your app projects\n  - Adjust publicPath/URL and shared deps versions\n  - Serve remote and host apps on distinct ports');
