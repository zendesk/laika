---
id: 'how-to-install'
title: 'How to install in your project'
sidebar_label: 'How to install in your project'
custom_edit_url: null
hide_title: true
---

# How to install in your project

## Installing the package

First you'll need to use your package manager to add Laika to your project.

```shell
$ npm install --save @zendesk/laika
# or if using yarn:
$ yarn add @zendesk/laika
```

Note that if you do not intend to use Laika for testing production code, you can use the `--save-dev` flag (or `--dev` in case of `yarn`) to install it as a development dependency.

Laika supports `@apollo/client` `>=3.2.5 <5` with `graphql` `^15 || ^16`.
If your project uses Apollo Client 4, make sure `rxjs` `^7.3.0` is installed as well.

## Loading the Laika Link in your project

For tests that run on your production code, you'll likely want to load the link conditionally, so that it is not downloaded by your users, but only in certain scenarios, such as inside of your browser test runner.

Include the link wherever you like in your chain of links. We recommend putting it right before the connection with the backend occurs for the most accurate results.

```ts
import { ApolloClient, ApolloLink, HttpLink } from '@apollo/client'
import { createLazyLoadableLaikaLink } from '@zendesk/laika'

const apolloClient = new ApolloClient({
  link: ApolloLink.from([
    new YourCustomLink(),
    ...(process.env.NODE_ENV === 'development'
      ? [
          createLazyLoadableLaikaLink({
            clientName: 'your-client-name',
            startLoggingImmediately: true,
          }),
        ]
      : []),
    new HttpLink(/* ... */),
  ]),
  // ...
})
```

### Customizing loading of the link

By default, the link is lazily loaded and, if you use webpack, split into a separate chunk by utilizing the `createLazyLoadableLink` function provided in the package.

You may customize this behavior. This is the default behavior:

```ts
import { createLazyLoadableLink } from '@zendesk/laika'

/**
 * @param {{clientName: string}} options
 */
export const createLazyLoadableLaikaLink = (options) =>
  createLazyLoadableLink(
    import(
      '@zendesk/laika/createGlobalLaikaLink' /* webpackChunkName: 'apolloLaikaLink' */
    ).then(({ createGlobalLaikaLink }) => createGlobalLaikaLink(options)),
  )
```

If you're using webpack, the `webpackChunkName` magic comment will ensure a separate chunk is created for the link.

## Conditionally enabling Laika

Most apps should enable Laika only for specific environments, developers, or test sessions.

Common patterns include:

- a build-time flag such as `NODE_ENV !== 'production'`
- a query parameter such as `?laika=1` or `?e2e=true`
- a test-only browser hook that your Playwright or Cypress suite opts into

For complete examples, see [Conditionally loading Laika](pathname:///docs/loading-laika-conditionally).

## Browser E2E runners

When you need to intercept requests that fire during the initial page render, register callbacks on `window.laikaReadyCallbacks` before the app code executes.

Use:

- [Usage in Playwright](pathname:///docs/usage-in-playwright) for `page.addInitScript()` / `browserContext.addInitScript()`
- [Usage in Cypress](pathname:///docs/usage-in-cypress) for `cy.visit(..., { onBeforeLoad })`

If you already know your app only enables Laika behind a query parameter, make sure your test navigates with that flag enabled as well.

## Loading the link in unit tests

If you have full control over the Apollo client inside of your tests, you may directly create the link from an instance of Laika:

```ts
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  gql,
} from '@apollo/client'
import { Laika } from '@zendesk/laika/esm/laika'

const laika = new Laika()

const terminatingLink = new ApolloLink(
  () =>
    new Observable((observer) => {
      observer.next?.({ data: { healthy: true } })
      observer.complete?.()
    }),
)

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([laika.createLink(), terminatingLink]),
})

afterEach(() => {
  laika.mockRestoreAll()
})

it('works', async () => {
  const interceptor = laika.intercept()
  interceptor.mockResultOnce({
    result: {
      data: {
        healthy: false,
      },
    },
  })

  await expect(
    client.query({
      query: gql`
        query Healthcheck {
          healthy
        }
      `,
    }),
  ).resolves.toMatchObject({
    data: { healthy: false },
  })
})
```

For a more complete unit-testing guide, see [Usage in Jest / Vitest](pathname:///docs/usage-in-jest-vitest).

Note that Laika itself isn't directly exported from `@zendesk/laika` in order to minimize the amount of data that is bundled with your application when using lazily loaded Laika in production.

If your test runner reuses the same page or process across tests, call `laika.mockRestoreAll()` in `afterEach` to clear all interceptors before the next scenario starts. See [Resetting Between Tests](pathname:///docs/resetting-between-tests).

## What can I import from the module?

See the [API reference](pathname:///docs/api).

## What next?

If you're deciding where Laika should sit in your test strategy, start with [Testing approach](pathname:///docs/testing-approach).

For advanced matcher, lifecycle, and passthrough patterns, see [Advanced usage](pathname:///docs/advanced-usage).
