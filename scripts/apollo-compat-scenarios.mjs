const apolloCompatScenarios = [
  {
    name: 'apollo3',
    // Apollo Client 3.2.5 predates the current TypeScript toolchain. Validate
    // it with a compiler/runtime combination that keeps the consumer and the
    // repository build type-clean without relying on skipLibCheck.
    consumerDependencies: {
      '@apollo/client': '3.2.5',
      '@types/node': '16.18.126',
      '@types/react': '16.14.67',
      graphql: '15.10.2',
      react: '16.14.0',
      typescript: '4.7.4',
    },
    workspaceDevDependencies: {
      '@apollo/client': '3.2.5',
      '@types/node': '16.18.126',
      '@types/react': '16.14.67',
      graphql: '15.10.2',
      react: '16.14.0',
      typescript: '4.7.4',
    },
    workspaceRemovedDevDependencies: ['rxjs'],
  },
  {
    name: 'apollo4',
    consumerDependencies: {
      '@apollo/client': '4.1.6',
      '@types/node': '20.17.30',
      '@types/react': '17.0.90',
      graphql: '16.13.2',
      react: '17.0.2',
      rxjs: '7.8.2',
      typescript: '5.7.3',
    },
    workspaceDevDependencies: {
      '@apollo/client': '4.1.6',
      '@types/node': '20.17.30',
      '@types/react': '17.0.90',
      graphql: '16.13.2',
      react: '17.0.2',
      rxjs: '7.8.2',
      typescript: '5.7.3',
    },
    workspaceRemovedDevDependencies: [],
  },
]

const getScenarioNameFromArgs = (argv) => {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--scenario') {
      return argv[index + 1]
    }

    if (arg.startsWith('--scenario=')) {
      return arg.slice('--scenario='.length)
    }
  }

  return undefined
}

export const getApolloCompatScenarios = (argv = process.argv.slice(2)) => {
  const scenarioName = getScenarioNameFromArgs(argv)

  if (!scenarioName) {
    return apolloCompatScenarios
  }

  const selectedScenario = apolloCompatScenarios.find(
    ({ name }) => name === scenarioName,
  )

  if (!selectedScenario) {
    throw new Error(
      `Unknown Apollo compatibility scenario "${scenarioName}". Expected one of: ${apolloCompatScenarios
        .map(({ name }) => name)
        .join(', ')}`,
    )
  }

  return [selectedScenario]
}

export { apolloCompatScenarios }
