# AI Agent Security Standard

This document defines mandatory security principles and restrictions for all AI coding assistants operating in this repository. All AI agents must follow these requirements without exception.

**Authority:** Derived from [Zendesk Minimum Baseline Security Standard](https://docs.google.com/document/d/17GZ9TpjKCt6WCdw3yxL44Ra_YscbOBVnVkUVGgx5Hz0/) and internal security policies.

---

## Core Security Mandate

Security is a first-class requirement. Every code suggestion must be evaluated against these guidelines. If a request would result in insecure code:

1. **Stop** and flag the security concern
2. **Explain** why it's problematic
3. **Propose** a secure alternative

AI-generated code requires human review before merging.

---

## Absolute Prohibitions

AI agents must **NEVER** do the following:

### Secrets & Credentials
- Hardcode secrets, credentials, API keys, tokens, or passwords in source code
- Store secrets in version control (`.env` files, config with real values)
- Log, print, or expose secret values
- Expose credentials in URLs, logs, or error messages

### Security Controls
- Disable or weaken security controls
- Bypass authentication or authorization checks
- Disable certificate validation
- Weaken password policies or MFA requirements

### Dangerous Code Patterns
- Generate code using raw string interpolation of untrusted input
- Use `eval()` or `exec()` with user-supplied input
- Implement custom cryptography
- Use deprecated algorithms (MD5, SHA-1, DES, RC4, ECB mode)

### Data Exposure
- Log sensitive data (PII, credentials, tokens, customer data)
- Expose stack traces or internal paths to end users
- Transmit sensitive data over unencrypted channels

---

## Required Security Patterns

### NPM Package Publishing

```bash
# Correct: use the TOTP-protected release script
yarn release
# This calls scripts/npm-release-with-totp.mjs which requires NPM_TOKEN
# and NPM_TOTP_DEVICE environment variables — never hardcode these
```

```bash
# NEVER: publish directly with credentials inline
NPM_TOKEN=abc123 npm publish
```

### Environment Variables

```typescript
// Correct: access secrets via environment variables
const npmToken = process.env.NPM_TOKEN
```

```typescript
// NEVER: hardcode tokens or API keys
const npmToken = "npm_abc123XYZ"
```

### Logging in Library Code

```typescript
// Correct: log only operation metadata and result shape
console.log(`LOG:GQL ${clientName}: ${type}`, { operation, result })
```

```typescript
// NEVER: log authentication headers, tokens, or PII in operation context
console.log('operation context:', operation.getContext()) // context may contain auth headers
```

---

## Security Requirements by Domain

### npm Release Pipeline
- Releases are gated behind semantic-release on `main`/`master`/`next` branches only
- NPM authentication uses `NPM_TOKEN` + TOTP from `NPM_TOTP_DEVICE` (both GitHub secrets)
- Release scripts (`scripts/npm-release-with-totp.mjs`, `scripts/release.mjs`) must not be modified to weaken these gates
- Never add direct `npm publish` commands that bypass the TOTP gate

### Dependency Management
- `yarn install --immutable` is enforced in CI — do not bypass with `--no-immutable`
- Dependabot is configured (`.github/dependabot.yml`) — keep it enabled
- Do not add `resolutions` overrides that force vulnerable package versions

### GraphQL Operation Context
- Apollo operation context may contain auth headers or tokens set by upstream links
- Never log `operation.getContext()` raw output in library code
- Matcher functions receive `Operation` objects — do not log or expose variables that may contain PII

### CI/CD Secrets
- GitHub Actions secrets (`NPM_TOKEN`, `NPM_TOTP_DEVICE`, `GITHUB_TOKEN`) must remain in GitHub secrets
- Do not add steps that echo or print these values
- The `npm-publish` environment requires both checks and test jobs to pass first

### Cryptography
| Use Case | Approved | Forbidden |
|----------|----------|-----------|
| Integrity hashing | SHA-256, SHA-3 | MD5, SHA-1 |
| Symmetric encryption | AES-256-GCM | DES, 3DES, AES-ECB |
| TLS | TLS 1.2+ | SSLv2/3, TLS 1.0/1.1 |

### Error Handling
- Do not expose internal stack traces to end users
- Errors passed to Apollo observers should be `Error` instances, not raw strings containing sensitive data
- The `toError()` pattern in `laika.ts` (converting unknown throws to `Error`) is the correct approach

---

## When to Stop and Escalate

Stop, explain the concern, and recommend involving Security if a task requires:

- Modifying the npm release pipeline to skip authentication or TOTP verification
- Adding new GitHub Actions steps that access or echo CI secrets
- Disabling Dependabot or suppressing security alerts
- Implementing custom crypto or auth logic
- Accessing or logging raw Apollo operation context that may contain auth headers
- Bypassing the semantic-release branch restrictions
- Working around the `--immutable` yarn lockfile enforcement

---

## Security Testing

When generating features, include:

- Tests that verify interceptors do not leak operation context or variables unintentionally
- Tests for error paths to ensure `Error` objects are propagated correctly (not raw strings)
- Negative test cases for invalid matcher inputs and empty recording states

---

## Reporting Vulnerabilities

If you discover a security vulnerability in this package, please report it via GitHub's [private vulnerability reporting](https://github.com/zendesk/laika/security/advisories/new) or contact [security@zendesk.com](mailto:security@zendesk.com).

---

## References

- [Minimum Baseline Security Standard](https://docs.google.com/document/d/17GZ9TpjKCt6WCdw3yxL44Ra_YscbOBVnVkUVGgx5Hz0/)
- [Cryptography Standards](https://techmenu.zende.sk/standards/cryptography-standards/)
- [Unified JWT Standard](https://techmenu.zende.sk/standards/unified-jwt/)

---

**Questions?** Reach out to the Security team or file a ticket via the Security Engagement process.
