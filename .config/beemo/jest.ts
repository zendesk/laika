export default {
  coverageThreshold: {
    global: {
      branches: 40,
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
}
