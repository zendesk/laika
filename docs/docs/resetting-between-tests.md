---
id: 'resetting-between-tests'
title: 'Resetting Between Tests'
sidebar_label: 'Resetting Between Tests'
custom_edit_url: null
hide_title: true
---

# Resetting Between Tests

When you use `createGlobalLaikaLink()`, the Apollo link and `window.laika` share the same `Laika` instance for the lifetime of the page. Every interceptor you create stays registered until you restore it.

If you reuse the same browser page or test process across multiple tests, stale interceptors from a previous test can keep matching later operations. The simplest fix is to run `laika.mockRestoreAll()` in your test framework's `afterEach` hook.

```ts
laika.mockRestoreAll()
```

`mockRestoreAll()` removes every interceptor created by that `Laika` instance, including interceptors created through `modifyRemote()`. It also restores passthrough behavior for future operations.

## Jest

Use this pattern when you create a `Laika` instance directly in your unit tests:

```ts
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  gql,
} from '@apollo/client'
import { Laika } from '@zendesk/laika/esm/laika'

const query = gql`
  query GetUsers {
    users {
      id
    }
  }
`

describe('users query', () => {
  let client: ApolloClient<unknown>
  let laika: Laika

  beforeEach(() => {
    laika = new Laika()
    client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.from([
        laika.createLink(),
        new HttpLink({ uri: '/graphql' }),
      ]),
    })
  })

  afterEach(() => {
    laika.mockRestoreAll()
  })

  it('mocks the query', async () => {
    laika.intercept({ operation: query }).mockResultOnce({
      result: {
        data: {
          users: [{ id: '1' }],
        },
      },
    })

    await expect(client.query({ query })).resolves.toMatchObject({
      data: {
        users: [{ id: '1' }],
      },
    })
  })
})
```

## Playwright

When Laika is loaded in the browser app, reset it from the page after every test:

```ts
import { test } from '@playwright/test'

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    window.laika?.mockRestoreAll()
  })
})
```

If your app lazy-loads Laika, make sure the page has already created `window.laika` before you try to use it.

## Cypress

In Cypress, keep using `cy.then()` / `cy.window()` so cleanup runs in command order:

```ts
afterEach(() => {
  cy.window()
    .its('laika')
    .then((laika) => {
      laika.mockRestoreAll()
    })
})
```

This works well together with the existing Cypress pattern where you grab `window.laika` once and use it inside later `cy.then()` callbacks.

## Active subscriptions

`mockRestoreAll()` clears Laika's interceptor state. It does not force Apollo components to create a brand new subscription on its own.

If your next test needs a fresh subscription scenario, also make sure the component is unmounted/remounted or otherwise re-subscribed by your test harness.
