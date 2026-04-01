import { execFileSync } from 'node:child_process'
import {
  cpSync,
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

const workspacePaths = [
  '.config',
  '.eslintignore',
  '.eslintrc.js',
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
  'src',
  'tsconfig.json',
  'yarn.lock',
]

const run = (command, args, cwd, extraEnv = {}) => {
  execFileSync(command, args, {
    cwd,
    env: {
      ...process.env,
      ...extraEnv,
    },
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

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

for (const scenario of scenarios) {
  const workspaceDir = mkdtempSync(
    path.join(tmpdir(), `laika-jest-${scenario.name}-`),
  )

  try {
    copyCompatWorkspace(workspaceDir)
    updatePackageJsonForScenario(workspaceDir, scenario)

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
