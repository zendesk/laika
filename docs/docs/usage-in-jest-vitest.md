---
id: 'usage-in-jest-vitest'
title: 'Usage in Jest / Vitest'
sidebar_label: 'Usage in Jest / Vitest'
custom_edit_url: null
hide_title: true
---

# Usage in Jest / Vitest

When you control the Apollo client directly inside the test, use a local `Laika` instance instead of the browser-global link. The setup is the same in Jest and Vitest; only the test-runner imports differ.

## Basic setup

Create a fresh `Laika` instance and Apollo client for each test, then clean up with `mockRestoreAll()` in `afterEach`.

```ts
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  gql,
} from '@apollo/client'
import { Laika } from '@zendesk/laika/esm/laika'

const getUsersQuery = gql`
  query GetUsers {
    users {
      id
      name
    }
  }
`

describe('users query', () => {
  let laika: Laika
  let client: ApolloClient<unknown>

  beforeEach(() => {
    laika = new Laika()

    const terminatingLink = new ApolloLink(
      () =>
        new Observable((observer) => {
          observer.next?.({
            data: {
              users: [],
            },
          })
          observer.complete?.()
        }),
    )

    client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.from([laika.createLink(), terminatingLink]),
    })
  })

  afterEach(() => {
    laika.mockRestoreAll()
  })

  it('mocks a query', async () => {
    laika.intercept({ operation: getUsersQuery }).mockResultOnce({
      result: {
        data: {
          users: [{ id: '1', name: 'Mouse' }],
        },
      },
    })

    await expect(client.query({ query: getUsersQuery })).resolves.toMatchObject(
      {
        data: {
          users: [{ id: '1', name: 'Mouse' }],
        },
      },
    )
  })
})
```

## Queue one-off responses

`mockResultOnce()` is useful when the same operation should return several states in sequence:

```ts
const interceptor = laika.intercept({ operationName: 'GetUsers' })

interceptor
  .mockResultOnce({
    result: {
      data: {
        users: [{ id: '1', name: 'Mouse' }],
      },
    },
  })
  .mockResultOnce({
    result: {
      data: {
        users: [{ id: '2', name: 'Bamboo' }],
      },
    },
  })
```

After the queued responses are consumed, Laika falls back to its normal passthrough behavior unless you configure a persistent `mockResult()` or disable network fallback.

## Test subscriptions and live updates

For subscriptions, wait until the client has subscribed and then push updates manually:

```ts
const activeUsersSubscription = gql`
  subscription ActiveUsers {
    activeUsers
  }
`

const interceptor = laika.intercept({ operation: activeUsersSubscription })
const received: unknown[] = []

const subscription = client
  .subscribe({ query: activeUsersSubscription })
  .subscribe({
    next: (result) => {
      received.push(result)
    },
  })

await interceptor.waitForActiveSubscription()

interceptor.fireSubscriptionUpdate({
  result: {
    data: {
      activeUsers: 10,
    },
  },
})

expect(received).toEqual([{ data: { activeUsers: 10 } }])

subscription.unsubscribe()
```

## Prefer documents over string names when you can

If the test already imports the GraphQL document, prefer:

```ts
laika.intercept({ operation: getUsersQuery })
```

over:

```ts
laika.intercept({ operationName: 'GetUsers' })
```

Matching on the document is harder to mistype and stays aligned with refactors.

## Cleanup

Keep using `laika.mockRestoreAll()` in `afterEach`, especially if the test process or Apollo client can survive between cases.

For more on cleanup semantics, see [Resetting Between Tests](pathname:///docs/resetting-between-tests).

For lifecycle hooks, passthrough control, and response modification, see [Advanced usage](pathname:///docs/advanced-usage).
