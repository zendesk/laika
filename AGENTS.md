# Laika

Laika is an Apollo Client testing library for intercepting, mocking, and recording GraphQL operations (queries, mutations, subscriptions) in both browser and unit test environments. Published as `@zendesk/laika` on npm; built with TypeScript and distributed as dual CJS + ESM.

## Setup & Commands

```bash
# Install dependencies
yarn install --immutable

# Build CJS and ESM distributions
yarn build

# Run all checks (format + types + lint + compat + unit tests)
yarn test

# Run Jest unit tests only
yarn test:code

# Run unit tests with coverage
yarn test:code --coverage

# Check Prettier formatting
yarn test:format

# Auto-format code
yarn format

# Check TypeScript types
yarn test:types

# Run ESLint
yarn test:lint

# Run Apollo 3/4 compatibility tests (requires build first)
yarn test:compat
```

Node version is pinned — see `.node-version`. Dependency versions: see `package.json`.

## Directory Guide

```
src/                          # Library source (TypeScript)
  main.ts                     # Public exports entry point
  laika.ts                    # Core Laika class, InterceptApi, LogApi
  createGlobalLaikaLink.ts    # Global singleton link factory
  createLazyLoadableLaikaLink.ts  # Lazy-load wrapper for production use
  createLazyLoadableLink.ts   # Generic lazy-loadable Apollo Link helper
  typedefs.ts                 # All TypeScript type definitions
  linkUtils.ts                # Matcher resolution & emit helpers
  hasOperation.ts             # GraphQL operation type detection
  observableUtils.ts          # Observable mapping utilities
  codeGenerator.ts            # Mock code generation from recordings
  constants.ts                # Global constants
  testUtils.ts                # Shared test helpers
tests/compat/                 # Apollo 3 and 4 compatibility test fixtures
scripts/                      # Release and compat test scripts
docs/                         # Docusaurus documentation site (separate workspace)
```

## Code Conventions

- **TypeScript strict mode** — all source under `src/` must pass `tsc --noEmit`
- **Named exports only** — no default exports in library source
- **Dual format** — compile to both `cjs/` (CommonJS) and `esm/` (ES modules)
- **Naming**: `PascalCase` for classes/types/interfaces, `camelCase` for functions/variables, `UPPER_SNAKE` for top-level constants
- **Formatting**: Prettier enforced — 2-space indent, single quotes, no semicolons, trailing commas, always-parens for arrow functions
- **No tabs** — ESLint enforces `no-tabs`
- **Lodash utilities** — prefer lodash helpers (`isMatch`, `memoize`, `camelCase`, etc.) over rolling your own
- Tests live **co-located** in `src/` as `*.test.ts`; integration tests as `src/integration.test.ts`
- Source uses `Observable` from `@apollo/client/core` — do **not** import from `rxjs` directly (rxjs is an optional peer dep for subscription support only)

## Testing

- Framework: **Jest** with SWC transformer (`@swc/jest`)
- Test files: `src/**/*.test.ts` (co-located with source)
- Run a single file: `yarn test:code -- src/laika.test.ts`
- Run with coverage: `yarn test:code --coverage --runInBand`
- Compat tests validate the built package against Apollo 3 and Apollo 4 — run `yarn build` first
- Coverage thresholds are defined in `jest.config.js`

## Do

- Export all public types from `src/main.ts`
- Use `ApolloLink` and `Observable` from `@apollo/client/core` for Apollo compatibility
- Use `getMatcherFn()` from `linkUtils.ts` when resolving `Matcher` inputs
- Use `mapObservable()` from `observableUtils.ts` for transforming Observables
- Write JSDoc comments on all public API methods (they generate the docs site via TypeDoc)
- Maintain Apollo 3 + 4 compatibility — test with `yarn test:compat` after changes to link internals
- Use `getLaikaSingleton()` (memoized) for global instances — don't create new `Laika()` instances outside tests
- Clean up interceptors in tests via `laika.mockRestoreAll()` in `afterEach`

## Don't

- Don't add runtime dependencies without careful consideration — this is a library and bundle size matters
- Don't use `rxjs` Observable directly in library source (keep Apollo 3 compatibility)
- Don't commit built artifacts (`cjs/`, `esm/`, `dist/`) — these are gitignored and CI-generated
- Don't use default exports in `src/`
- Don't use `console.log` in library code (except in the intentional logging/recording APIs inside `laika.ts`)
- Don't skip the compat tests when changing link internals — `yarn test:compat` is required

## Architecture

See `ARCHITECTURE.md` for system architecture, component relationships, and design decisions.

## Security

See `SECURITY.md` for mandatory security requirements, prohibited patterns, and escalation triggers.

## Safety & Permissions

Allowed without approval:
- Read/list files
- Run individual test files and linters
- Run type check on specific files

Ask before:
- Installing or removing packages
- Deleting files or directories
- Running full test suite or build
- Modifying CI/CD configuration
- Publishing or creating releases

## PR & Commit Guidelines

- Commit format: `type(scope): description` (conventional commits, enforced by commitlint)
- Allowed types: `feat`, `fix`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, `test`, `build`, `wip`
- Branch naming: `username/verb-noun` (e.g., `alice/fix-subscription-leak`)
- PRs require at least one approval and passing CI before merge
- Maintainers squash-merge using the PR title as the conventional commit message
- See `.github/CONTRIBUTING.md` for full workflow

## References

- Architecture: `ARCHITECTURE.md`
- Security: `SECURITY.md`
- Contributing: `.github/CONTRIBUTING.md`
- Docs site source: `docs/`
- Published docs: https://zendesk.github.io/laika/docs/
