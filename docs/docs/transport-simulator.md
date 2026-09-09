---
id: 'transport-simulator'
title: 'Transport simulation'
sidebar_label: 'Transport simulation'
custom_edit_url: null
hide_title: true
---

# Transport simulation

Each `Laika` instance owns transport simulation for its link. Configure
`laika.transport`, then use the normal `laika.createLink()` path; no second
Apollo link or controller needs to be composed into the chain.

```ts
import { ApolloLink } from '@apollo/client/core'
import { Laika } from '@zendesk/laika/esm/laika'

const laika = new Laika()
laika.transport.set({
  mode: 'targeted',
  rules: [
    {
      matcher: { operationName: 'GetProfile' },
      latencyMs: 500,
    },
  ],
})

const link = ApolloLink.from([laika.createLink(), terminatingLink])
```

Laika observes every operation first. Its usual interception and mocking
behavior runs next; when an operation is passed through, simulation runs
immediately before the following transport link. Mocked responses are not
simulated as transport requests. Use `delay` on a mocked result when that is
the behavior you need to test.

## Targeted simulation

Targeted rules use Laika's normal `Matcher`, so they can scope effects by
operation name, client, feature, variables, document, or a matcher function.
The first matching rule supplies both the delay and optional failure.

```ts
laika.transport.set({
  mode: 'targeted',
  rules: [
    {
      matcher: {
        clientName: 'support-web',
        operationName: 'GetTicket',
      },
      latencyMs: 500,
    },
    {
      matcher: { operationName: 'UpdateTicket' },
      failure: {
        kind: 'graphql',
        message: 'Ticket updates are unavailable',
      },
    },
  ],
})
```

Use `kind: 'network'` to fail through Apollo's error path. A GraphQL failure
emits `{ data: null, errors }` and does not call the following link.

## Chaos simulation

Chaos applies a randomized delay and independently samples the error
probability for every matching passthrough operation.

```ts
laika.transport.set({
  mode: 'chaos',
  matcher: { clientName: 'support-web' },
  latency: { minMs: 100, maxMs: 600 },
  errorProbability: 20,
})
```

Chaos skips subscriptions by default because they are long-lived. Enable them
only when testing subscription startup or reconnect behavior:

```ts
laika.transport.set({
  mode: 'chaos',
  latency: { minMs: 100, maxMs: 600 },
  errorProbability: 20,
  includeSubscriptions: true,
})
```

Pass `undefined` to disable transport simulation for future passthrough
operations:

```ts
laika.transport.set(undefined)
```

## Diagnostics

`snapshot()` provides the configuration, first-seen operations, and a bounded
history of decisions. A consumer-owned DevTools panel can subscribe and render
that snapshot without becoming part of the request path.

```ts
const unsubscribe = laika.transport.subscribe(() => {
  const { operations, decisions } = laika.transport.snapshot()
  renderOperationPicker(operations)
  renderSimulationLog(decisions)
})

unsubscribe()
```

Listener failures are ignored so a broken panel cannot break an Apollo
operation.

## Global Laika link

`onLaikaReady` configures the same instance-owned controls when using the
global link:

```ts
import { createGlobalLaikaLink } from '@zendesk/laika/createGlobalLaikaLink'

createGlobalLaikaLink({
  clientName: 'support-web',
  onLaikaReady: (laika) => {
    laika.transport.set({
      mode: 'chaos',
      latency: { minMs: 100, maxMs: 600 },
      errorProbability: 20,
    })
  },
})
```

See the generated [transport API](pathname:///docs/api/Laika/classes/TransportApi)
for the complete public contract.
