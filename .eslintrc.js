module.exports = {
  root: true,
  extends: ['plugin:import/typescript', 'niieani', 'niieani/browser'],
  plugins: ['eslint-comments'],
  overrides: [
    {
      files: [
        '**/{tests,__tests__}/**/*.test!(*.d).{ts,tsx,cts,mts,js,jsx,cjs,mjs}',
        '**/{tests,__tests__}/**/!(*.d).{ts,tsx,cts,mts,js,jsx,cjs,mjs}',
        '**/*.test!(*.d).{ts,tsx,cts,mts,js,jsx,cjs,mjs}',
      ],
      rules: {
        '@typescript-eslint/ban-ts-ignore': 'off',
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
          },
        ],
        'node/no-unpublished-import': 'off',
      },
    },
  ],
  rules: {
    complexity: 'off',
    'sort-keys': 'off',
    'no-tabs': 'error',
    'no-nested-ternary': 'off',
    'no-plusplus': 'off',
    'unicorn/expiring-todo-comments': 'off',
    'eslint-comments/disable-enable-pair': [
      'error',
      {
        allowWholeFile: true,
      },
    ],
    'eslint-comments/no-aggregating-enable': 'error',
    'eslint-comments/no-duplicate-disable': 'error',
    'eslint-comments/no-unlimited-disable': 'error',
    'eslint-comments/no-unused-disable': 'error',
    'eslint-comments/no-unused-enable': 'error',
    'eslint-comments/no-use': [
      'error',
      {
        allow: [
          'eslint-disable',
          'eslint-disable-line',
          'eslint-disable-next-line',
          'eslint-enable',
        ],
      },
    ],
    'import/no-default-export': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    'promise/prefer-await-to-callbacks': 'off',
    'promise/prefer-await-to-then': 'off',
    'compat/compat': 'off',
  },
}
