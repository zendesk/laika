const path = require('path')

module.exports = {
  entryPoints: [path.resolve(__dirname, '../src/main.ts')],
  tsconfig: path.join(__dirname, 'tsconfig.typedoc.json'),
  excludePrivate: true,
  excludeInternal: true,
  entryFileName: 'index.md',
  hideBreadcrumbs: true,
  hidePageHeader: true,
  readme: 'none',
}
