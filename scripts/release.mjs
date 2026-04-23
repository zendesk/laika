import { execFileSync } from 'node:child_process'

const { GITHUB_REPOSITORY, GITHUB_TOKEN } = process.env

if (!GITHUB_REPOSITORY) {
  throw new Error('Release step must be run inside of a GitHub Action')
}

if (!GITHUB_TOKEN) {
  throw new Error('Release step requires GITHUB_TOKEN')
}

const dryRun = process.argv.includes('--dry-run')
const origin = `https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git`

execFileSync('npm', ['config', 'set', 'workspaces-update', 'false'], {
  stdio: 'inherit',
})
execFileSync('git', ['remote', 'set-url', 'origin', origin], {
  stdio: 'inherit',
})
execFileSync('git', ['config', '--global', 'user.email', 'action@github.com'], {
  stdio: 'inherit',
})
execFileSync('git', ['config', '--global', 'user.name', 'GitHub Action'], {
  stdio: 'inherit',
})

const semanticReleaseArgs = ['--tag-format', '${version}']

if (dryRun) {
  semanticReleaseArgs.push('--dry-run')
}

execFileSync('semantic-release', semanticReleaseArgs, {
  stdio: 'inherit',
})
