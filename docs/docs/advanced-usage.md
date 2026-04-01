---
id: 'advanced-usage'
title: 'Advanced Usage'
sidebar_label: 'Advanced Usage'
custom_edit_url: null
hide_title: true
---

# Advanced Usage

Laika exposes a few capabilities that are easy to miss if you only start from the basic `intercept(...).mockResult(...)` flow.

## Match more precisely

Interceptors can match on:

- `operationName`
- `operation`
- `variables`
- `clientName`
- `feature`
- a custom matcher function

```ts
const interceptor = laika.intercept({
  clientName: 'support-web',
  feature: 'ticket-sidebar',
  operationName: 'GetTicket',
  variables: { id: '123' },
})
```

If another link tags the operation context with `feature`, you can use that to scope logging and mocking more narrowly.

Every interceptor also records its matched variables in `interceptor.calls`, similar to `jest.fn().mock.calls`.

## Queue responses and choose how long they live

Use `mockResultOnce()` when a response should be consumed a limited number of times:

```ts
const interceptor = laika.intercept({ operationName: 'GetUsers' })

interceptor
  .mockResultOnce({ result: { data: { users: [{ id: '1' }] } } })
  .mockResultOnce({ result: { data: { users: [{ id: '2' }] } } })
  .mockResult({ result: { data: { users: [] } } })
```

Use:

- `mockReset()` to clear the current mock configuration but keep the interceptor registered
- `mockRestore()` to remove just that interceptor
- `mockRestoreAll()` to remove every interceptor created by the `Laika` instance

## Wait for subscriptions and mount events

You can wait for the next matching operation:

```ts
const interceptor = laika.intercept({ operationName: 'GetUsers' })

await interceptor.waitForNextSubscription()
```

Or attach a lifecycle callback:

```ts
const interceptor = laika.intercept({ operationName: 'GetUsers' })

interceptor.onSubscribe(({ operation, observer }) => {
  if (operation.variables.preview) {
    observer.next?.({
      data: {
        users: [],
      },
    })
    observer.complete?.()
  }
})
```

Return a cleanup function from `onSubscribe()` if the interceptor needs to dispose any test-local state when the observer disconnects.

## Turn off network fallback

By default, unmatched queries and mutations can still fall through to the next Apollo link. If you want a request to stay in a loading state until your test explicitly responds, disable that fallback:

```ts
const interceptor = laika.intercept({ operationName: 'GetUsers' })

interceptor.disableNetworkFallback()

interceptor.onSubscribe(({ observer }) => {
  observer.next?.({
    data: {
      users: [{ id: '1', name: 'Mouse' }],
    },
  })
  observer.complete?.()
})
```

Use `allowNetworkFallback()` to restore the default passthrough behavior.

## Modify real backend responses without fully mocking them

`modifyRemote()` is the higher-level API for the "let the request go through, then adjust the result" pattern:

```ts
laika.modifyRemote({ operationName: 'GetTicket' }, (result) => ({
  ...result,
  data: {
    ...result.data,
    injectedByLaika: true,
  },
}))
```

This is useful for fuzzing edge cases while still exercising the real backend response shape.

## Customize the global singleton

`createGlobalLaikaLink()` and `createLazyLoadableLaikaLink()` support a few options that are easy to overlook:

```ts
createLazyLoadableLaikaLink({
  clientName: 'support-web',
  globalPropertyName: 'supportLaika',
  startLoggingImmediately: true,
  onLaikaReady: (laika) => {
    laika.log.startRecording('opening a ticket')
  },
})
```

This changes the singleton name from `window.laika` to `window.supportLaika`.

Browser tests can hook into the same lifecycle with:

```ts
window.supportLaikaReadyCallbacks = window.supportLaikaReadyCallbacks ?? []
window.supportLaikaReadyCallbacks.push((laika) => {
  laika.intercept({ operationName: 'GetTicket' })
})
```

See [Usage in Playwright](pathname:///docs/usage-in-playwright) and [Usage in Cypress](pathname:///docs/usage-in-cypress) for the browser-runner patterns built on top of that hook.
