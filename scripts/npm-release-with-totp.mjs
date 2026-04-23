import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const packageJson = JSON.parse(
  readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
)

const [command, version, branchName] = process.argv.slice(2)

const log = (message) => {
  process.stderr.write(`${message}\n`)
}

const requireEnv = (name) => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required for npm release publishing`)
  }

  return value
}

const computeDistTag = (branch) => {
  if (!branch) {
    throw new Error('Branch name is required to compute the npm dist-tag')
  }

  if (branch === 'main' || branch === 'master') {
    return 'latest'
  }

  if (/^\d+(?:\.\d+)?\.x$/u.test(branch)) {
    return `release-${branch}`
  }

  return branch
}

const createNpmUserConfig = (token) => {
  const configDir = mkdtempSync(path.join(tmpdir(), 'laika-npmrc-'))
  const configPath = path.join(configDir, '.npmrc')

  writeFileSync(
    configPath,
    [
      '//registry.npmjs.org/:_authToken=' + token,
      'always-auth=true',
      'registry=https://registry.npmjs.org/',
    ].join('\n') + '\n',
  )

  return {
    cleanup: () => rmSync(configDir, { recursive: true, force: true }),
    configPath,
  }
}

const createReleaseEnv = () => {
  const token = requireEnv('NPM_TOKEN')
  const { cleanup, configPath } = createNpmUserConfig(token)

  return {
    cleanup,
    env: {
      ...process.env,
      NPM_CONFIG_USERCONFIG: configPath,
    },
  }
}

const generateOtp = () => {
  const totpDevice = requireEnv('NPM_TOTP_DEVICE')

  return execFileSync('oathtool', ['--base32', '--totp', totpDevice], {
    encoding: 'utf8',
  }).trim()
}

const runNpm = (args) => {
  const { cleanup, env } = createReleaseEnv()

  try {
    execFileSync('npm', args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
    })
  } finally {
    cleanup()
  }
}

const findReleaseTarball = (releaseVersion) => {
  const distDir = path.join(repoRoot, 'dist')
  const tarballs = readdirSync(distDir)
    .filter((entry) => entry.endsWith('.tgz'))
    .sort()

  if (tarballs.length !== 1) {
    throw new Error(
      `Expected exactly one release tarball in dist/, found ${tarballs.length}`,
    )
  }

  const tarballPath = path.join(distDir, tarballs[0])

  if (!tarballs[0].includes(releaseVersion)) {
    throw new Error(
      `Release tarball ${tarballs[0]} does not include version ${releaseVersion}`,
    )
  }

  return tarballPath
}

const verify = () => {
  requireEnv('NPM_TOKEN')
  requireEnv('NPM_TOTP_DEVICE')
  execFileSync('oathtool', ['--version'], { stdio: 'ignore' })
}

const publish = (releaseVersion, branch) => {
  const distTag = computeDistTag(branch)
  const otp = generateOtp()
  const tarballPath = findReleaseTarball(releaseVersion)
  const publishArgs = ['publish', tarballPath, '--tag', distTag, '--otp', otp]

  if (packageJson.publishConfig?.access) {
    publishArgs.push('--access', packageJson.publishConfig.access)
  }

  log(
    `Publishing ${path.basename(tarballPath)} to npm with dist-tag ${distTag}`,
  )
  runNpm(publishArgs)
}

const addChannel = (releaseVersion, branch) => {
  const distTag = computeDistTag(branch)
  const otp = generateOtp()
  const packageSpec = `${packageJson.name}@${releaseVersion}`

  log(`Adding npm dist-tag ${distTag} to ${packageSpec}`)
  runNpm(['dist-tag', 'add', packageSpec, distTag, '--otp', otp])
}

switch (command) {
  case 'verify':
    verify()
    break
  case 'publish':
    publish(version, branchName)
    break
  case 'add-channel':
    addChannel(version, branchName)
    break
  default:
    throw new Error(
      'Usage: node ./scripts/npm-release-with-totp.mjs <verify|publish|add-channel> [version] [branch]',
    )
}
