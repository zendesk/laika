---
id: 'transport-simulator'
title: 'Transport simulator'
sidebar_label: 'Transport simulator'
custom_edit_url: null
hide_title: true
---

# Transport simulator

`createTransportSimulator()` creates an isolated, non-terminating Apollo link
for exercising loading and error behavior. It can sit in front of any Apollo
transport; it does not depend on a specific schema, backend, or browser global.

```ts
import { ApolloLink } from '@apollo/client/core'
import { createTransportSimulator } from '@zendesk/laika'

const transport = createTransportSimulator()

const link = ApolloLink.from([
  transport.link,
  terminatingLink,
])
```

The simulator link must have a following link. It decides whether to delay or
fail an operation before calling that following link. For subscriptions, delay
applies when opening the subscription; later payloads are passed through
unchanged.

## What it enables

Use the simulator to make transport behavior visible and repeatable while
developing a client: verify loading states, empty/error views, retry handling,
and how concurrent operations behave under delay. It is useful in local
development, component demos, and automated tests without requiring a special
backend or schema.

Laika deliberately provides the link and its controller, not a user interface.
A consumer project can build its own controls or DevTools around the controller:
list operations discovered at runtime, choose operations for targeted behavior,
switch to chaos mode, and show the bounded decision log. The UI remains owned by
the consumer and can match its application's development workflow.

For example, a consumer-owned DevTools panel can subscribe to controller changes
and use the same controller to update behavior:

```ts
transport.controller.subscribe((change) => {
  if (change.kind === 'operations') {
    renderOperationPicker(transport.controller.getOperations())
  }

  if (change.kind === 'log') {
    renderSimulationLog(transport.controller.getLog())
  }
})

enableChaosButton.addEventListener('click', () => {
  transport.controller.set({
    mode: 'chaos',
    latency: { minMs: 100, maxMs: 600 },
    errorProbability: 20,
  })
})
```

`renderOperationPicker`, `renderSimulationLog`, and `enableChaosButton` are
consumer-owned UI details; the simulator does not assume a framework or runtime
environment.

## Modes

The simulator has exactly two modes.

### Targeted

Targeted mode applies rules only to selected operation names. There is no global
latency or all-operations shortcut.

```ts
transport.controller.set({
  mode: 'targeted',
  latency: {
    operations: ['GetProfile'],
    latencyMs: 500,
  },
  fail: {
    operations: ['UpdateProfile'],
    kind: 'graphql',
    message: 'Profile updates are unavailable',
  },
})
```

Use `kind: 'network'` to fail through Apollo's error path. A GraphQL failure
emits `{ data: null, errors }` and completes without forwarding the operation.

### Chaos

Chaos mode applies a randomized latency interval and independently samples an
error probability for every included operation. It replaces all targeted rules.

```ts
transport.controller.set({
  mode: 'chaos',
  latency: { minMs: 100, maxMs: 600 },
  errorProbability: 20,
})
```

Chaos skips subscriptions by default because they are long-lived. Enable them
only when testing subscription startup or reconnect behavior:

```ts
transport.controller.set({
  mode: 'chaos',
  latency: { minMs: 100, maxMs: 600 },
  errorProbability: 20,
  includeSubscriptions: true,
})
```

## Runtime controls and diagnostics

Each simulator owns a controller. Its state is independent from other clients
and is never persisted.

```ts
const unsubscribe = transport.controller.subscribe((change) => {
  if (change.kind === 'operations') {
    console.log(transport.controller.getOperations())
  }
  if (change.kind === 'log') {
    console.table(transport.controller.getLog())
  }
})

transport.controller.reset()
transport.controller.clearLog()
unsubscribe()
```

The controller records operation names in first-seen order and keeps a bounded
log of applied latency, injected failures, chaos subscription skips, and the
options snapshot that produced each decision. Configure the bound when creating
the simulator:

```ts
const transport = createTransportSimulator({ maxLogEntries: 200 })
```

For deterministic tests, inject a scheduler and random source:

```ts
const transport = createTransportSimulator({
  scheduler: { delay: async () => undefined },
  random: () => 0,
})
```

See the generated [transport simulator API](pathname:///docs/api/transportSimulator)
for the complete public contract.
