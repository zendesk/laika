import { ESLintConfig } from '@beemo/driver-eslint'

const config: ESLintConfig = {
  rules: {
    'import/no-default-export': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    'promise/prefer-await-to-callbacks': 'off',
    'promise/prefer-await-to-then': 'off',
    'compat/compat': 'off',
  },
}

export default config
