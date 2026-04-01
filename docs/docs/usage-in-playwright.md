---
id: 'usage-in-playwright'
title: 'Usage in Playwright'
sidebar_label: 'Usage in Playwright'
custom_edit_url: null
hide_title: true
---

# Usage in Playwright

Use Playwright when you want the real browser runtime but still need direct control over GraphQL traffic. The key constraint is timing: if the app fires queries during the initial render, setup after `page.goto()` is already too late.

## Make sure the app actually enables Laika

If your app only loads Laika behind a query parameter or a test flag, navigate with that flag enabled.

For patterns such as `?laika=1` or `?e2e=true`, see [Conditionally loading Laika](pathname:///docs/loading-laika-conditionally).

## Install interceptors before navigation

Use `page.addInitScript()` or `browserContext.addInitScript()` to register callbacks on `window.laikaReadyCallbacks`.

Laika runs every callback in that array when `createGlobalLaikaLink()` or `createLazyLoadableLaikaLink()` creates the global singleton.

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
  await page.goto('http://localhost:4200/login?laika=1')

  await expect(page.getByText('Mouse')).toBeVisible()
})
```

This keeps the mocking logic in the test harness instead of moving it into the application through `onLaikaReady`.

## Update mocks after the page has loaded

If you store interceptors on `window`, you can reconfigure them later in the same test:

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

## Assert which variables were used

Each interceptor keeps a `calls` array with every set of variables that matched it:

```ts
const calls = await page.evaluate(() => {
  return window.__laikaTestState.getDataInterceptor.calls
})

expect(calls).toEqual([{ page: 1 }])
```

## When waiting for `window.laika` is enough

If you do not need to affect requests fired during app boot, a simpler pattern is fine:

```ts
await page.goto('http://localhost:4200/login?laika=1')
await page.waitForFunction(() => Boolean(window.laika))
```

From there you can create interceptors through `page.evaluate()` or `page.evaluateHandle()`.

For initial requests, keep using `addInitScript()` and ready callbacks.

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
