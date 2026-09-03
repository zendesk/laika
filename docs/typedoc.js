const path = require('path')

module.exports = {
  entryPoints: [
    path.resolve(__dirname, '../src/main.ts'),
    path.resolve(__dirname, '../src/laika.ts'),
    path.resolve(__dirname, '../src/createGlobalLaikaLink.ts'),
    path.resolve(__dirname, '../src/createLazyLoadableLaikaLink.ts'),
    path.resolve(__dirname, '../src/createLazyLoadableLink.ts'),
    path.resolve(__dirname, '../src/typedefs.ts'),
  ],
  tsconfig: path.join(__dirname, 'tsconfig.typedoc.json'),
  excludePrivate: true,
  excludeInternal: true,
  entryModule: '@zendesk/laika',
  entryFileName: 'index.md',
  hideBreadcrumbs: true,
  hidePageHeader: true,
  router: 'member',
  readme: 'none',
}
