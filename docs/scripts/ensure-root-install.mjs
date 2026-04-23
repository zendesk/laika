import { access } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(docsRoot, '..')

const requiredPaths = [
  path.join(repoRoot, 'node_modules', '@apollo', 'client'),
  path.join(repoRoot, 'node_modules', 'graphql'),
  path.join(repoRoot, 'node_modules', 'lodash'),
  path.join(repoRoot, 'tsconfig.json'),
]

const missingPaths = (
  await Promise.all(
    requiredPaths.map(async (requiredPath) => {
      try {
        await access(requiredPath)
        return null
      } catch {
        return requiredPath
      }
    }),
  )
).filter(Boolean)

if (missingPaths.length === 0) {
  process.exit(0)
}

console.log(
  'Preparing root workspace dependencies for TypeDoc because the docs build needs the package source and generated tsconfig.',
)

await new Promise((resolve, reject) => {
  const child = spawn('yarn', ['install', '--immutable'], {
    cwd: repoRoot,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  child.on('error', reject)
  child.on('exit', (code) => {
    if (code === 0) {
      resolve()
      return
    }

    reject(new Error(`Root workspace install failed with exit code ${code}`))
  })
})
