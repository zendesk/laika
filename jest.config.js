module.exports = {
  collectCoverage: false,
  collectCoverageFrom: [
    '**/{src,tests,__tests__}/**/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}',
  ],
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: [
    'node_modules/',
    'build/',
    'cjs/',
    'coverage/',
    'dist/',
    'dts/',
    'esm/',
    'lib/',
    'mjs/',
    'umd/',
  ],
  coverageReporters: ['lcov', 'text-summary'],
  coverageThreshold: {
    global: {
      branches: 39,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    './src/codeGenerator*.ts': {
      branches: 0,
      statements: 0,
      lines: 0,
      functions: 0,
    },
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'cts',
    'mts',
    'js',
    'jsx',
    'cjs',
    'mjs',
    'json',
    'node',
  ],
  moduleNameMapper: {
    '\\.(css|sass|scss|less|gif|png|jpg|jpeg|svg|gql|graphql|yml|yaml)$':
      '<rootDir>/.config/jest/fileMock.cjs',
  },
  setupFilesAfterEnv: [],
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/packages/*/src/**/*.test.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
    '<rootDir>/src/**/*.test.{ts,tsx,mts,cts}',
  ],
  snapshotFormat: {
    escapeString: false,
    printBasicPrototype: false,
  },
  clearMocks: true,
  transform: {
    '^.+\\.(c|m)?(t|j)sx?$': '@swc/jest',
  },
}
