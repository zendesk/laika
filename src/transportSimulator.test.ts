import { ApolloLink, Observable } from '@apollo/client/core'
import gql from 'graphql-tag'
import waitFor from 'wait-for-observables'
import { createTransportSimulator } from './transportSimulator'
import { executeLink, WaitForResult } from './testUtils'

const query = gql`
  query GetProfile {
    profile {
      id
    }
  }
`

const otherQuery = gql`
  query GetCollections {
    collections {
      id
    }
  }
`

const subscription = gql`
  subscription ProfileUpdates {
    profileUpdates {
      id
    }
  }
`

const response = { data: { profile: { id: '1' } } }

const createDeferred = () => {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

const terminalLink = (request: jest.Mock) =>
  new ApolloLink((operation) => {
    request(operation)
    return new Observable((observer) => {
      observer.next?.(response)
      observer.complete?.()
    })
  })

describe('createTransportSimulator', () => {
  it('keeps controller state isolated, defensive, and observable', async () => {
    const simulator = createTransportSimulator({ maxLogEntries: 1 })
    const changes: string[] = []
    simulator.controller.subscribe((change) => changes.push(change.kind))

    const applied = {
      mode: 'targeted' as const,
      latency: { operations: ['GetProfile'], latencyMs: 25 },
    }
    simulator.controller.set(applied)
    applied.latency.operations[0] = 'MutatedByCaller'

    const request = jest.fn()
    const link = ApolloLink.from([simulator.link, terminalLink(request)])
    await waitFor(executeLink(link, { query }))
    await waitFor(executeLink(link, { query: otherQuery }))

    const options = simulator.controller.get()
    const nextOptions = simulator.controller.get()
    expect(options).toEqual({
      mode: 'targeted',
      latency: { operations: ['GetProfile'], latencyMs: 25 },
    })
    if (
      options.mode === 'targeted' &&
      nextOptions.mode === 'targeted' &&
      options.latency &&
      nextOptions.latency
    ) {
      expect(options.latency.operations).not.toBe(
        nextOptions.latency.operations,
      )
    }
    expect(simulator.controller.get()).toEqual({
      mode: 'targeted',
      latency: { operations: ['GetProfile'], latencyMs: 25 },
    })
    expect(simulator.controller.getOperations()).toEqual([
      'GetProfile',
      'GetCollections',
    ])
    expect(simulator.controller.getLog()).toHaveLength(1)
    expect(changes).toEqual([
      'options',
      'operations',
      'log',
      'operations',
      'log',
    ])
  })

  it('delays only selected targeted operations before forwarding', async () => {
    const delay = createDeferred()
    const scheduler = { delay: jest.fn(() => delay.promise) }
    const simulator = createTransportSimulator({
      initial: {
        mode: 'targeted',
        latency: { operations: ['GetProfile'], latencyMs: 250 },
      },
      scheduler,
    })
    const request = jest.fn()
    const link = ApolloLink.from([simulator.link, terminalLink(request)])

    const delayedResult = waitFor(executeLink(link, { query }))
    await Promise.resolve()
    expect(scheduler.delay).toHaveBeenCalledWith(250)
    expect(request).not.toHaveBeenCalled()

    delay.resolve()
    await expect(delayedResult).resolves.toHaveLength(1)

    await waitFor(executeLink(link, { query: otherQuery }))
    expect(scheduler.delay).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('injects network and GraphQL failures without forwarding', async () => {
    const networkSimulator = createTransportSimulator({
      initial: {
        mode: 'targeted',
        fail: {
          operations: ['GetProfile'],
          kind: 'network',
          message: 'offline',
        },
      },
    })
    const networkRequest = jest.fn()
    const networkLink = ApolloLink.from([
      networkSimulator.link,
      terminalLink(networkRequest),
    ])

    const networkResult = (await waitFor(
      executeLink(networkLink, { query }),
    )) as WaitForResult<unknown>
    expect((networkResult[0]?.error as Error).message).toBe('offline')
    expect(networkRequest).not.toHaveBeenCalled()

    const graphqlSimulator = createTransportSimulator({
      initial: {
        mode: 'targeted',
        fail: {
          operations: ['GetProfile'],
          kind: 'graphql',
          message: 'forbidden',
        },
      },
    })
    const graphqlRequest = jest.fn()
    const graphqlLink = ApolloLink.from([
      graphqlSimulator.link,
      terminalLink(graphqlRequest),
    ])
    const [result] = (await waitFor(
      executeLink(graphqlLink, { query }),
    )) as WaitForResult<{
      data: null
      errors: readonly Error[]
    }>

    expect(result?.values?.[0]).toMatchObject({
      data: null,
      errors: [expect.objectContaining({ message: 'forbidden' })],
    })
    expect(graphqlRequest).not.toHaveBeenCalled()
  })

  it('uses chaos for the latency interval and error probability and skips subscriptions by default', async () => {
    const scheduler = { delay: jest.fn(() => Promise.resolve()) }
    const simulator = createTransportSimulator({
      initial: {
        mode: 'chaos',
        latency: { minMs: 100, maxMs: 200 },
        errorProbability: 50,
      },
      scheduler,
      random: jest
        .fn(() => 0)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0),
    })
    const request = jest.fn()
    const link = ApolloLink.from([simulator.link, terminalLink(request)])

    const chaosResult = (await waitFor(
      executeLink(link, { query }),
    )) as WaitForResult<unknown>
    expect((chaosResult[0]?.error as Error).message).toContain(
      'network failure',
    )
    expect(scheduler.delay).toHaveBeenCalledWith(150)
    expect(request).not.toHaveBeenCalled()

    const subscriptionObserver = {
      next: jest.fn(),
      error: jest.fn(),
      complete: jest.fn(),
    }
    const subscriptionHandle = executeLink(link, {
      query: subscription,
    }).subscribe(subscriptionObserver)
    await Promise.resolve()
    subscriptionHandle.unsubscribe()

    expect(scheduler.delay).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(1)
    expect(simulator.controller.getLog()).toMatchObject([
      {
        operationName: 'GetProfile',
        latencyMs: 150,
        injectedFailure: { kind: 'network' },
      },
      {
        operationName: 'ProfileUpdates',
        operationType: 'subscription',
        latencyMs: 0,
        chaosSkipped: true,
      },
    ])
  })

  it('does not forward a cancelled delayed operation', async () => {
    const delay = createDeferred()
    const simulator = createTransportSimulator({
      initial: {
        mode: 'targeted',
        latency: { operations: ['GetProfile'], latencyMs: 25 },
      },
      scheduler: { delay: () => delay.promise },
    })
    const request = jest.fn()
    const link = ApolloLink.from([simulator.link, terminalLink(request)])

    const handle = executeLink(link, { query }).subscribe({})
    await Promise.resolve()
    handle.unsubscribe()
    delay.resolve()
    await Promise.resolve()

    expect(request).not.toHaveBeenCalled()
  })
})
