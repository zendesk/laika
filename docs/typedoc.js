const { Renderer } = require('marked')
const highlightjs = require('highlight.js')
const path = require('path')

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeForHTML(input) {
  return input.replace(/(["&'<>])/g, (char) => escapeMap[char])
}

// Create your custom renderer.
const renderer = new Renderer()
renderer.code = (code, language) => {
  // Check whether the given language is valid for highlight.js.
  const validLang = !!(language && highlightjs.getLanguage(language))

  // Highlight only if the language is valid.
  // highlight.js escapes HTML in the code, but we need to escape by ourselves
  // when we don't use it.
  const highlighted = validLang
    ? highlightjs.highlight(language, code).value
    : escapeForHTML(code)

  // Render the highlighted code with `hljs` class.
  return `<pre><code class="hljs ${language}">${highlighted}</code></pre>`
}

module.exports = {
  entryPoints: [
    path.resolve(__dirname, '../src/main.ts'),
    path.resolve(__dirname, '../src/laika.ts'),
    path.resolve(__dirname, '../src/createGlobalLaikaLink.ts'),
    path.resolve(__dirname, '../src/createLazyLoadableLaikaLink.ts'),
    path.resolve(__dirname, '../src/createLazyLoadableLink.ts'),
    path.resolve(__dirname, '../src/typedefs.ts'),
  ],
  tsconfig: path.join(__dirname, '../tsconfig.json'),
  excludePrivate: true,
  excludeInternal: true,

  // Media can be linked to with media://file.jpg in doc comments.
  media: path.resolve(__dirname, '../media'),
  // Files can be injected into the generated documentation with [[include:file.md]] in a doc comment
  includes: path.join(__dirname, 'docs-meta'),
  markedOptions: {
    renderer,
  },
}
