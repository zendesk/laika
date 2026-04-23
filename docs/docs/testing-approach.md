---
id: 'testing-approach'
title: 'Testing Approach'
sidebar_label: 'Testing Approach'
custom_edit_url: null
hide_title: true
---

# Testing Approach

Laika works at multiple layers. The best setup depends on how much of the real application stack you want in each test.

## Start with the smallest useful layer

Use the smallest test surface that still answers the question you care about.

- Use [Usage in Jest / Vitest](pathname:///docs/usage-in-jest-vitest) when you control the Apollo client inside the test and want fast feedback.
- Use [Usage in Playwright](pathname:///docs/usage-in-playwright) or [Usage in Cypress](pathname:///docs/usage-in-cypress) when you need the real browser runtime, routing, and application boot flow.
- Use your framework's own network tools alongside Laika if the scenario also depends on REST, HTML, or any non-Apollo traffic.

## Prefer precise interceptors

Create the most specific interceptor that solves the scenario.

Good constraints include:

- `operation` when you have the typed document available
- `operationName` when you only know the GraphQL operation name
- `variables` when a single operation is reused in several modes
- `clientName` when multiple Apollo clients exist in the same page
- `feature` when another link annotates the operation context

Avoid leaving an unrestricted catch-all interceptor active longer than necessary. Laika always uses the first matching interceptor.

## Pick the right Laika entry point

Use direct `Laika` instances in unit-style tests:

```ts
const laika = new Laika()
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([laika.createLink(), terminatingLink]),
})
```

Use the global link in browser tests:

```ts
createLazyLoadableLaikaLink({
  clientName: 'support-web',
})
```

This makes the singleton available as `window.laika` once the link is created.

## Treat logging and recording as discovery tools

Laika's logging and recording are especially useful when you are first mapping a scenario:

- log requests to confirm which operations actually run
- record a happy path to bootstrap fixtures
- trim the generated code down to only the data that matters for the test

Do not feel obligated to keep generated mocks exactly as recorded. Use the recording as a starting point, not a final design.

## Reset state after every test

Browser runners and long-lived test processes often reuse the same page or Apollo client. Clean up with `mockRestoreAll()` after each test so interceptors from one case do not shadow the next one.

For details, see [Resetting Between Tests](pathname:///docs/resetting-between-tests).

## Keep production behavior opt-in

When Laika lives in application code, enable it explicitly. Typical patterns are:

- development-only builds
- a query parameter such as `?laika=1`
- an E2E-only flag

See [Conditionally loading Laika](pathname:///docs/loading-laika-conditionally).
