---
id: 'usage-in-cypress'
title: 'Usage in Cypress'
sidebar_label: 'Usage in Cypress'
custom_edit_url: null
hide_title: true
---

# Usage in Cypress

Due to Cypress execution order, keep any interaction with Laika inside `cy.then()` or `cy.window()` chains. The pattern works well once you remember that Cypress queues commands instead of running them immediately.

## Access `window.laika` in command order

If your test only needs to intercept requests after the page is already loaded, grab `window.laika` once and keep using it in later `cy.then()` callbacks:

```ts
describe('My suite', () => {
  let laika

  beforeEach(() => {
    cy.visit('/?laika=1')

    cy.window()
      .its('laika')
      .then((instance) => {
        laika = instance
      })
  })

  it('waits for the subscription, pushes out data and asserts the element updated', () => {
    let getActiveUsersInterceptor

    cy.then(() => {
      getActiveUsersInterceptor = laika.intercept({
        clientName: 'users',
        operationName: 'getActiveUsers',
      })
    })

    cy.then({ timeout: 5000 }, async () => {
      await getActiveUsersInterceptor.waitForActiveSubscription()
      getActiveUsersInterceptor.fireSubscriptionUpdate({
        result: { data: { count: 10 } },
      })
    })

    cy.get('activeUsers').contains(
      'There are 10 users currently active on the website',
    )
  })
})
```

## Install interceptors before initial requests

If the app fires GraphQL requests during boot, use `cy.visit(..., { onBeforeLoad })` and register `window.laikaReadyCallbacks` before the application code runs.

`onBeforeLoad` is the Cypress equivalent of Playwright's `page.addInitScript()`.

```ts
beforeEach(() => {
  cy.visit('/login?laika=1', {
    onBeforeLoad(window) {
      window.__laikaTestState = {}
      window.laikaReadyCallbacks = window.laikaReadyCallbacks ?? []

      window.laikaReadyCallbacks.push((laika) => {
        const getDataInterceptor = laika.intercept({
          clientName: 'fe-client',
          operationName: 'GetData',
        })

        getDataInterceptor.mockResult({
          result: {
            data: {
              testData: [{ id: '1', name: 'Mouse' }],
            },
          },
        })

        window.__laikaTestState.getDataInterceptor = getDataInterceptor
      })
    },
  })
})
```

## Reconfigure mocks later in the test

Once you have stored an interceptor on `window`, you can update it in command order:

```ts
cy.window().then((window) => {
  window.__laikaTestState.getDataInterceptor.mockReset().mockResult({
    result: {
      data: {
        testData: [{ id: '2', name: 'Bamboo' }],
      },
    },
  })
})
```

## Reset Laika after each test

If Cypress keeps the same page alive between tests, clear Laika's interceptors in `afterEach`:

```ts
afterEach(() => {
  cy.window()
    .its('laika')
    .then((laika) => {
      laika.mockRestoreAll()
    })
})
```

This prevents interceptors from one test from matching operations in the next one. For Jest and Playwright examples as well, see [Resetting Between Tests](pathname:///docs/resetting-between-tests).

## Component tests and persistent pages

Component tests often keep the same Cypress browser context around for many cases. In that setup:

- reset Laika after every test
- avoid broad catch-all interceptors that can shadow later tests
- prefer specific matchers such as `operation`, `operationName`, or `variables`

If your component mounts immediately and fires queries on boot, the `onBeforeLoad` pattern above is usually the right starting point.

## Pitfall: data that comes outside Apollo

With all the ease that [recording and code generation](pathname:///docs/logging-and-recording) gives, it can be easy to forget that there may be other sources of data on the path to success.

If you've set up all the GraphQL mocks that were captured and your application still doesn't behave as expected, check the network tab for REST calls or other traffic that Laika does not own.

Fortunately, Cypress provides the necessary built-in tools to move forward:

```ts
cy.intercept(`**/api/v2/tickets/${issueId}?**`, myJsonFixtureResponse).as(
  'issueFetch',
)

cy.wait('@issueFetch')
```
