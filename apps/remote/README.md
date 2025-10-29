Remote app (Module Federation)

This is a placeholder remote application. To wire Module Federation into it:

1. Run: `npm run mf:init` to generate example MF configs under `tools/module-federation/generated`.
2. Copy `tools/module-federation/generated/remote.webpack.config.js` into your remote app build (webpack) and expose components via the `exposes` field.
3. Serve the remote on a distinct port and point the host `remotes` entry at the `remoteEntry.js` URL.
