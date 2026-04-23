# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```console
cd ..
yarn install --immutable

cd docs
yarn install --immutable
```

The docs site generates API reference pages from the package source, so the root workspace dependencies and generated `tsconfig.json` need to exist. The docs scripts will bootstrap those root dependencies automatically if they are missing, but installing both workspaces upfront is faster and keeps the setup explicit.

## Local Development

```console
yarn start
```

This command starts a local development server and opens a browser window. Most changes are reflected live without having to restart the server.
The docs home at `/docs/` is generated from the repository root `README.md` before the site starts or builds. The generated README page, copied README media, and generated API reference docs all stay gitignored.

## Build

```console
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

```console
GIT_USER=<Your GitHub username> USE_SSH=true yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
