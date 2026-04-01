---
id: 'usage-in-playwright'
title: 'Usage in Playwright'
sidebar_label: 'Usage in Playwright'
custom_edit_url: null
hide_title: true
---

# Usage in Playwright

If your app runs GraphQL operations during the initial render, waiting for `window.laika` after `page.goto()` is too late. Register your Laika setup before the page loads so the interceptors exist before the first query or mutation starts.

## Install interceptors before navigation

Use `page.addInitScript()` or `browserContext.addInitScript()` to register callbacks on `window.laikaReadyCallbacks`.

Laika will run every callback in that array when `createGlobalLaikaLink()` or `createLazyLoadableLaikaLink()` creates the global singleton.

```ts
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (mockedData) => {
      window.__laikaTestState = {}
      window.laikaReadyCallbacks = window.laikaReadyCallbacks ?? []

      window.laikaReadyCallbacks.push((laika) => {
        const getDataInterceptor = laika.intercept({
          clientName: 'fe-client',
          operationName: 'GetData',
        })

        getDataInterceptor.mockResult({
          result: {
            data: mockedData,
          },
        })

        window.__laikaTestState.getDataInterceptor = getDataInterceptor
      })
    },
    {
      testData: [{ id: '1', name: 'Mouse' }],
    },
  )
})

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    window.laika?.mockRestoreAll()
  })
})

test('shows mocked data from the first query', async ({ page }) => {
  await page.goto('http://localhost:4200/login')

  await expect(page.getByText('Mouse')).toBeVisible()
})
```

This keeps the mocking logic in the test harness instead of moving it into the application through `onLaikaReady`.

## Update mocks later in the test

Store the interceptor on `window` if you want to change the response after the page has loaded:

```ts
await page.evaluate(
  (nextData) => {
    window.__laikaTestState.getDataInterceptor.mockReset().mockResult({
      result: {
        data: nextData,
      },
    })
  },
  {
    testData: [{ id: '2', name: 'Bamboo' }],
  },
)
```

## Custom global property names

If your app uses `globalPropertyName: 'myLaika'`, register callbacks on `window.myLaikaReadyCallbacks` instead of `window.laikaReadyCallbacks`.

The callback suffix always matches the configured global property name:

```ts
await page.addInitScript(() => {
  window.myLaikaReadyCallbacks = window.myLaikaReadyCallbacks ?? []
  window.myLaikaReadyCallbacks.push((laika) => {
    laika.intercept({ clientName: 'fe-client', operationName: 'GetData' })
  })
})
```

## Reset state between tests

If Playwright reuses the page between tests, clear interceptors in `afterEach`:

```ts
test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    window.laika?.mockRestoreAll()
  })
})
```

For more on cleanup behavior and active subscriptions, see [Resetting Between Tests](pathname:///docs/resetting-between-tests).
