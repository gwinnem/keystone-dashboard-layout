# How to test the npm package before publishing it

Superseded by `scripts/check-package-install.js` (`pnpm run
check:package-install`) — a real, automated pack-and-install smoke
test, run in CI on every push/PR (see the root `ci.yml`'s own "Verify
the published Vue package actually installs and resolves" step), not
a manual procedure a person has to remember to run. That script packs
the tarball and installs it into a genuinely separate scratch
directory, asserting every `exports` subpath actually resolves.

The manual steps below still work if you want to inspect the packed
tarball by hand for some other reason:

```sh
npm pack
```

```sh
npm install @keystone-dashboard-layout/vue-*.tgz
```

(run from whatever other project you're testing the package against).
