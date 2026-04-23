import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getApolloCompatScenarios } from './apollo-compat-scenarios.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const scenarios = getApolloCompatScenarios()
const npmCliPath = path.resolve(
  path.dirname(process.execPath),
  '../lib/node_modules/npm/bin/npm-cli.js',
)
const yarnCliPath = process.env.npm_execpath
const hasNodeRunnableYarnCli =
  typeof yarnCliPath === 'string' && /\.(?:c?js|mjs)$/.test(yarnCliPath)

const workspacePaths = [
  '.config',
  'eslint.config.cjs',
  '.gitignore',
  '.node-version',
  '.npmignore',
  '.prettierignore',
  '.yarn',
  '.yarnrc.yml',
  'LICENSE',
  'README.md',
  'babel.config.js',
  'jest.config.js',
  'package.json',
  'prettier.config.js',
  'scripts',
  'src',
  'tsconfig.json',
  'yarn.lock',
]

const compatWorkspaceRemovedDevDependencies = [
  '@eslint/js',
  'eslint',
  'eslint-plugin-import',
  'globals',
  'typescript-eslint',
]

const run = (command, args, cwd, extraEnv = {}) => {
  const env = {
    ...process.env,
    ...extraEnv,
  }

  if (command === 'node') {
    execFileSync(process.execPath, args, {
      cwd,
      env,
      stdio: 'inherit',
    })
    return
  }

  if (command === 'npm' && existsSync(npmCliPath)) {
    execFileSync(process.execPath, [npmCliPath, ...args], {
      cwd,
      env,
      stdio: 'inherit',
    })
    return
  }

  if (command === 'yarn' && hasNodeRunnableYarnCli) {
    execFileSync(process.execPath, [yarnCliPath, ...args], {
      cwd,
      env,
      stdio: 'inherit',
    })
    return
  }

  execFileSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
  })
}

const copyCompatWorkspace = (workspaceDir) => {
  for (const relativePath of workspacePaths) {
    cpSync(
      path.join(repoRoot, relativePath),
      path.join(workspaceDir, relativePath),
      {
        recursive: true,
      },
    )
  }
}

const updatePackageJsonForScenario = (workspaceDir, scenario) => {
  const packageJsonPath = path.join(workspaceDir, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    ...scenario.workspaceDevDependencies,
  }

  for (const dependencyName of scenario.workspaceRemovedDevDependencies) {
    delete packageJson.devDependencies[dependencyName]
  }

  for (const dependencyName of compatWorkspaceRemovedDevDependencies) {
    delete packageJson.devDependencies[dependencyName]
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

const updateTsconfigForScenario = (workspaceDir) => {
  const tsconfigPath = path.join(workspaceDir, 'tsconfig.json')
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'))

  delete tsconfig.compilerOptions?.ignoreDeprecations
  delete tsconfig.compilerOptions?.types

  writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`)
}

for (const scenario of scenarios) {
  const workspaceDir = mkdtempSync(
    path.join(tmpdir(), `laika-jest-${scenario.name}-`),
  )

  try {
    copyCompatWorkspace(workspaceDir)
    updatePackageJsonForScenario(workspaceDir, scenario)
    updateTsconfigForScenario(workspaceDir)

    run('yarn', ['install'], workspaceDir, {
      YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
    })
    run('yarn', ['build'], workspaceDir)
    run('yarn', ['test:code', '--runInBand'], workspaceDir, {
      CI: '1',
    })
  } finally {
    rmSync(workspaceDir, { recursive: true, force: true })
  }
}
