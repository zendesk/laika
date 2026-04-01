import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const fixturesDir = path.join(repoRoot, 'tests', 'compat')
const tscPath = path.join(repoRoot, 'node_modules', '.bin', 'tsc')

const scenarios = [
  {
    name: 'apollo3',
    // Apollo Client 3.2.5 ships type declarations that are not clean under modern TS.
    skipLibCheck: true,
    dependencies: {
      '@apollo/client': '3.2.5',
      '@types/node': '20.17.30',
      '@types/react': '16.14.67',
      graphql: '15.10.2',
      react: '16.14.0',
    },
  },
  {
    name: 'apollo4',
    skipLibCheck: false,
    dependencies: {
      '@apollo/client': '4.1.6',
      '@types/node': '20.17.30',
      '@types/react': '17.0.90',
      graphql: '16.13.2',
      react: '17.0.2',
      rxjs: '7.8.2',
    },
  },
]

const run = (command, args, cwd) => {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
  })
}

const getTsconfig = ({ skipLibCheck }) => ({
  compilerOptions: {
    target: 'es2020',
    module: 'esnext',
    moduleResolution: 'node',
    strict: true,
    esModuleInterop: true,
    skipLibCheck,
    noEmit: true,
  },
  include: ['./consumer.ts'],
})

const rawPackOutput = execFileSync('npm', ['pack', '--json'], {
  cwd: repoRoot,
  encoding: 'utf8',
})

const packOutputMatch = rawPackOutput.match(/\[\s*{[\s\S]*}\s*\]\s*$/)

if (!packOutputMatch) {
  throw new Error(`Unable to parse npm pack output:\n${rawPackOutput}`)
}

const packOutput = JSON.parse(packOutputMatch[0])

const [{ filename }] = packOutput
const tarballPath = path.resolve(repoRoot, filename)

try {
  for (const scenario of scenarios) {
    const workspaceDir = mkdtempSync(
      path.join(tmpdir(), `laika-${scenario.name}-`),
    )

    try {
      for (const fixture of ['consumer.ts', 'runtime.cjs']) {
        cpSync(
          path.join(fixturesDir, fixture),
          path.join(workspaceDir, fixture),
        )
      }

      writeFileSync(
        path.join(workspaceDir, 'tsconfig.json'),
        `${JSON.stringify(getTsconfig(scenario), null, 2)}\n`,
      )

      const packageJsonPath = path.join(workspaceDir, 'package.json')
      const packageJson = {
        name: `laika-${scenario.name}-compat`,
        private: true,
        type: 'module',
        dependencies: {
          ...scenario.dependencies,
          '@zendesk/laika': `file:${tarballPath}`,
        },
      }

      writeFileSync(
        packageJsonPath,
        `${JSON.stringify(packageJson, null, 2)}\n`,
      )

      run(
        'npm',
        [
          'install',
          '--audit=false',
          '--ignore-scripts',
          '--no-fund',
          '--no-package-lock',
        ],
        workspaceDir,
      )
      run(
        tscPath,
        ['--project', path.join(workspaceDir, 'tsconfig.json')],
        workspaceDir,
      )
      run('node', [path.join(workspaceDir, 'runtime.cjs')], workspaceDir)
    } finally {
      rmSync(workspaceDir, { recursive: true, force: true })
    }
  }
} finally {
  rmSync(tarballPath, { force: true })
}
