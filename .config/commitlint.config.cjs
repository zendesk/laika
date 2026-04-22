module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-case': [0, 'always'],
    'body-case': [0, 'always'],
    'scope-case': [0, 'always'],
    'subject-case': [0, 'always'],
    'type-case': [0, 'always'],
    'header-max-length': [0, 'always'],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'wip',
      ],
    ],
  },
}
