---
id: 'loading-laika-conditionally'
title: 'Conditionally Loading Laika'
sidebar_label: 'Conditionally Loading Laika'
custom_edit_url: null
hide_title: true
---

# Conditionally Loading Laika

Most applications should not load Laika for every user session. The usual pattern is to add the link only when a test runner, developer, or explicit debug flag asks for it.

The important rule is simple: when Laika is disabled, omit the link from the Apollo link chain entirely.

## Gate Laika behind a query parameter

This is the most convenient option for browser E2E tests because the test can opt in at navigation time:

```ts
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client'
import { createLazyLoadableLaikaLink } from '@zendesk/laika'

const isLaikaEnabled = () => {
  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  return params.get('laika') === '1' || params.get('e2e') === 'true'
}

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([
    authLink,
    ...(isLaikaEnabled()
      ? [
          createLazyLoadableLaikaLink({
            clientName: 'support-web',
          }),
        ]
      : []),
    new HttpLink({ uri: '/graphql' }),
  ]),
})
```

Your Playwright or Cypress test can then navigate with `?laika=1` or `?e2e=true` and install interceptors before the page boot finishes.

## Gate Laika behind an environment flag

If you only want Laika in local development or a dedicated test build:

```ts
const shouldEnableLaika =
  process.env.NODE_ENV === 'development' || process.env.E2E === 'true'

const links = [
  authLink,
  ...(shouldEnableLaika
    ? [
        createLazyLoadableLaikaLink({
          clientName: 'support-web',
        }),
      ]
    : []),
  new HttpLink({ uri: '/graphql' }),
]
```

This is often the simplest setup for component tests or local debugging.

## Enable logging only when a flag is present

You can use the same condition to turn on logging right away:

```ts
const shouldStartLoggingImmediately = () => {
  if (typeof window === 'undefined') return false

  return new URLSearchParams(window.location.search).get('laikaLog') === '1'
}

createLazyLoadableLaikaLink({
  clientName: 'support-web',
  startLoggingImmediately: shouldStartLoggingImmediately(),
})
```

## Use a custom lazy import

If you need a different chunk name or a more customized loading flow, wrap `createGlobalLaikaLink()` yourself:

```ts
import { createLazyLoadableLink } from '@zendesk/laika'

export const createCustomLaikaLink = (options) =>
  createLazyLoadableLink(
    import(
      '@zendesk/laika/createGlobalLaikaLink' /* webpackChunkName: 'apolloLaikaLink' */
    ).then(({ createGlobalLaikaLink }) => createGlobalLaikaLink(options)),
  )
```

Keep the condition outside this helper. When Laika is off, do not include the helper in the link array.

## Pair conditional loading with browser-test setup

If you conditionally enable Laika for browser tests:

- make the test navigate with the same query parameter or flag
- install `window.laikaReadyCallbacks` before page scripts run
- reset interceptors in `afterEach`

See:

- [Usage in Playwright](pathname:///docs/usage-in-playwright)
- [Usage in Cypress](pathname:///docs/usage-in-cypress)
