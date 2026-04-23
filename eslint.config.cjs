const js = require('@eslint/js')
const importPlugin = require('eslint-plugin-import')
const globals = require('globals')
const tseslint = require('typescript-eslint')

const sourceFiles = ['**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}']
const testFiles = [
  '**/{tests,__tests__}/**/*.test!(*.d).{ts,tsx,cts,mts,js,jsx,cjs,mjs}',
  '**/{tests,__tests__}/**/!(*.d).{ts,tsx,cts,mts,js,jsx,cjs,mjs}',
  '**/*.test!(*.d).{ts,tsx,cts,mts,js,jsx,cjs,mjs}',
]

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'cjs/**',
      'coverage/**',
      'dist/**',
      'dts/**',
      'esm/**',
      'lib/**',
      'mjs/**',
      'umd/**',
    ],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    files: sourceFiles,
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: [
            '.js',
            '.jsx',
            '.cjs',
            '.mjs',
            '.ts',
            '.tsx',
            '.cts',
            '.mts',
          ],
        },
      },
    },
    rules: {
      complexity: 'off',
      'sort-keys': 'off',
      'no-tabs': 'error',
      'no-nested-ternary': 'off',
      'no-plusplus': 'off',
      'import/no-default-export': 'off',
      'import/no-named-as-default': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
      },
    },
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
    },
  },
)
