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

const NPM_REGISTRY = 'https://registry.npmjs.org/'
const NPM_OIDC_AUDIENCE = 'npm:registry.npmjs.org'

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
    throw new Error(`${name} is required for npm trusted publishing`)
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

const readJsonResponse = async (response) => {
  const responseText = await response.text()

  if (!responseText) {
    return {}
  }

  try {
    return JSON.parse(responseText)
  } catch (error) {
    throw new Error(
      `Expected JSON response from ${response.url}: ${responseText}`,
      {
        cause: error,
      },
    )
  }
}

const fetchGithubIdToken = async () => {
  const requestUrl = new URL(requireEnv('ACTIONS_ID_TOKEN_REQUEST_URL'))

  requestUrl.searchParams.set('audience', NPM_OIDC_AUDIENCE)

  const response = await fetch(requestUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${requireEnv('ACTIONS_ID_TOKEN_REQUEST_TOKEN')}`,
    },
  })
  const responseBody = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(
      `GitHub OIDC token request failed with ${response.status}: ${
        responseBody.message ?? response.statusText
      }`,
    )
  }

  if (!responseBody.value) {
    throw new Error('GitHub OIDC token response did not include a token value')
  }

  return responseBody.value
}

const exchangeNpmToken = async () => {
  requireEnv('GITHUB_ACTIONS')

  const idToken = await fetchGithubIdToken()
  const packageName = encodeURIComponent(packageJson.name)
  const exchangeUrl = new URL(
    `/-/npm/v1/oidc/token/exchange/package/${packageName}`,
    NPM_REGISTRY,
  )

  const response = await fetch(exchangeUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  })
  const responseBody = await readJsonResponse(response)

  if (!response.ok) {
    const npmMessage = responseBody.message ?? response.statusText
    const bootstrapHint =
      response.status === 404
        ? ' Run the "npm trusted publishing" workflow to register ci-cd.yml as the trusted publisher for this package.'
        : ''

    throw new Error(
      `npm OIDC token exchange failed with ${response.status}: ${npmMessage}.${bootstrapHint}`,
    )
  }

  if (!responseBody.token) {
    throw new Error('npm OIDC token exchange response did not include a token')
  }

  return responseBody.token
}

const createNpmUserConfig = (token) => {
  const configDir = mkdtempSync(path.join(tmpdir(), 'laika-npmrc-'))
  const configPath = path.join(configDir, '.npmrc')

  writeFileSync(
    configPath,
    [
      `registry=${NPM_REGISTRY}`,
      `//registry.npmjs.org/:_authToken=${token}`,
      '',
    ].join('\n'),
  )

  return {
    cleanup: () => rmSync(configDir, { recursive: true, force: true }),
    configPath,
  }
}

const createReleaseEnv = async () => {
  const token = await exchangeNpmToken()
  const { cleanup, configPath } = createNpmUserConfig(token)

  return {
    cleanup,
    env: {
      ...process.env,
      NPM_CONFIG_USERCONFIG: configPath,
    },
  }
}

const runNpm = async (args) => {
  const { cleanup, env } = await createReleaseEnv()

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

const verify = async () => {
  await exchangeNpmToken()
}

const publish = async (releaseVersion, branch) => {
  const distTag = computeDistTag(branch)
  const tarballPath = findReleaseTarball(releaseVersion)
  const publishArgs = ['publish', tarballPath, '--tag', distTag, '--provenance']

  if (packageJson.publishConfig?.access) {
    publishArgs.push('--access', packageJson.publishConfig.access)
  }

  log(
    `Publishing ${path.basename(tarballPath)} to npm with dist-tag ${distTag}`,
  )
  await runNpm(publishArgs)
}

const addChannel = async (releaseVersion, branch) => {
  const distTag = computeDistTag(branch)
  const packageSpec = `${packageJson.name}@${releaseVersion}`

  log(`Adding npm dist-tag ${distTag} to ${packageSpec}`)
  await runNpm(['dist-tag', 'add', packageSpec, distTag])
}

switch (command) {
  case 'verify':
    await verify()
    break
  case 'publish':
    await publish(version, branchName)
    break
  case 'add-channel':
    await addChannel(version, branchName)
    break
  default:
    throw new Error(
      'Usage: node ./scripts/npm-release-with-oidc.mjs <verify|publish|add-channel> [version] [branch]',
    )
}
