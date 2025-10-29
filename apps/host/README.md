Host app (Module Federation)

This is a placeholder host application. To wire Module Federation into it:

1. Run: `npm run mf:init` to generate example MF configs under `tools/module-federation/generated`.
2. Copy `tools/module-federation/generated/host.webpack.config.js` into your host build setup (webpack or adapter) and merge with your app's webpack config.
3. Update the `remotes` field to point to the running remote apps and adjust `shared` singleton versions.

This placeholder exists so the monorepo has concrete `app` projects for Module Federation examples and Nx project tags.
