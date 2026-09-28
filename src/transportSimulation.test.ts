import { ApolloLink, Observable } from '@apollo/client/core'
import gql from 'graphql-tag'
import waitFor from 'wait-for-observables'
import { Laika } from './laika'
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

const anonymousSubscription = gql`
  subscription {
    profileUpdates {
      id
    }
  }
`

const response = { data: { profile: { id: '1' } } }

const terminalLink = (request: jest.Mock) =>
  new ApolloLink((operation) => {
    request(operation)
    return new Observable((observer) => {
      observer.next?.(response)
      observer.complete?.()
    })
  })

const createLink = (laika: Laika, request: jest.Mock) =>
  ApolloLink.from([laika.createLink(), terminalLink(request)])

describe('Laika transport simulation', () => {
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it.each([
    [
      'a targeted rule without an effect',
      {
        mode: 'targeted',
        rules: [{ matcher: { operationName: 'GetProfile' } }],
      },
      'must provide latencyMs or failure',
    ],
    [
      'a chaos minimum greater than its maximum',
      { mode: 'chaos', latency: { minMs: 20, maxMs: 10 }, errorProbability: 0 },
      'configuration.latency.minMs must be less than or equal',
    ],
    [
      'a negative chaos minimum',
      { mode: 'chaos', latency: { minMs: -1, maxMs: 10 }, errorProbability: 0 },
      'configuration.latency.minMs',
    ],
    [
      'a chaos probability above 100',
      {
        mode: 'chaos',
        latency: { minMs: 0, maxMs: 10 },
        errorProbability: 101,
      },
      'configuration.errorProbability',
    ],
  ])('rejects %s', (_name, configuration, message) => {
    const laika = new Laika()

    expect(() => laika.transport.set(configuration as never)).toThrow(message)
    expect(laika.transport.snapshot().configuration).toBeUndefined()
  })

  it('owns isolated, defensive, observable diagnostics', async () => {
    const laika = new Laika()
    const changes: number[] = []
    laika.transport.subscribe(() => changes.push(1))
    laika.transport.subscribe(() => {
      throw new Error('broken DevTools panel')
    })

    const configuration = {
      mode: 'targeted' as const,
      rules: [
        {
          matcher: { operationName: 'GetProfile' },
          latencyMs: 0,
        },
      ],
    }
    laika.transport.set(configuration)
    const [firstRule] = configuration.rules
    if (!firstRule) throw new Error('Expected a targeted rule')
    firstRule.latencyMs = 25

    const request = jest.fn()
    const link = ApolloLink.from([
      laika.createLink((operation) => {
        operation.setContext({ clientName: 'support', feature: 'ticket' })
      }),
      terminalLink(request),
    ])
    await waitFor(executeLink(link, { query }))
    await waitFor(executeLink(link, { query: otherQuery }))

    const firstSnapshot = laika.transport.snapshot()
    const secondSnapshot = laika.transport.snapshot()
    expect(firstSnapshot.configuration).toEqual({
      mode: 'targeted',
      rules: [
        {
          matcher: { operationName: 'GetProfile' },
          latencyMs: 0,
          failure: undefined,
        },
      ],
    })
    expect(firstSnapshot.operations).toEqual([
      {
        operationName: 'GetProfile',
        operationType: 'query',
        clientName: 'support',
        feature: 'ticket',
      },
      {
        operationName: 'GetCollections',
        operationType: 'query',
        clientName: 'support',
        feature: 'ticket',
      },
    ])
    expect(firstSnapshot.decisions).toHaveLength(2)
    expect(firstSnapshot.decisions).not.toBe(secondSnapshot.decisions)
    expect(changes).toHaveLength(5)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('delays only matching targeted operations before forwarding', async () => {
    jest.useFakeTimers()
    const laika = new Laika()
    laika.transport.set({
      mode: 'targeted',
      rules: [
        {
          matcher: { operationName: 'GetProfile' },
          latencyMs: 250,
        },
      ],
    })
    const request = jest.fn()
    const link = createLink(laika, request)

    const delayedResult = waitFor(executeLink(link, { query }))
    await Promise.resolve()
    expect(request).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(250)
    await expect(delayedResult).resolves.toHaveLength(1)

    await waitFor(executeLink(link, { query: otherQuery }))
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('injects network and GraphQL failures without forwarding', async () => {
    const networkLaika = new Laika()
    networkLaika.transport.set({
      mode: 'targeted',
      rules: [
        {
          matcher: { operationName: 'GetProfile' },
          failure: { kind: 'network', message: 'offline' },
        },
      ],
    })
    const networkRequest = jest.fn()
    const networkResult = (await waitFor(
      executeLink(createLink(networkLaika, networkRequest), { query }),
    )) as WaitForResult<unknown>
    expect((networkResult[0]?.error as Error).message).toBe('offline')
    expect(networkRequest).not.toHaveBeenCalled()

    const graphqlLaika = new Laika()
    graphqlLaika.transport.set({
      mode: 'targeted',
      rules: [
        {
          matcher: { operationName: 'GetProfile' },
          failure: { kind: 'graphql', message: 'forbidden' },
        },
      ],
    })
    const graphqlRequest = jest.fn()
    const [result] = (await waitFor(
      executeLink(createLink(graphqlLaika, graphqlRequest), { query }),
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

  it('uses chaos for latency and error probability while skipping subscriptions', async () => {
    jest.useFakeTimers()
    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
    const laika = new Laika()
    laika.transport.set({
      mode: 'chaos',
      latency: { minMs: 100, maxMs: 200 },
      errorProbability: 50,
    })
    const request = jest.fn()
    const link = createLink(laika, request)

    const chaosResult = waitFor(executeLink(link, { query }))
    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(150)
    const result = (await chaosResult) as WaitForResult<unknown>
    expect((result[0]?.error as Error).message).toContain('network failure')
    expect(request).not.toHaveBeenCalled()

    const subscriptionHandle = executeLink(link, {
      query: subscription,
    }).subscribe({})
    await Promise.resolve()
    subscriptionHandle.unsubscribe()

    expect(request).toHaveBeenCalledTimes(1)
    expect(laika.transport.snapshot().decisions).toMatchObject([
      {
        operation: { operationName: 'GetProfile' },
        latencyMs: 150,
        injectedFailure: { kind: 'network' },
      },
      {
        operation: {
          operationName: 'ProfileUpdates',
          operationType: 'subscription',
        },
        latencyMs: 0,
        chaosSkipped: true,
      },
    ])
  })

  it('keeps fractional chaos delays within the configured interval', async () => {
    jest.useFakeTimers()
    jest.spyOn(Math, 'random').mockReturnValue(0.99)
    const laika = new Laika()
    laika.transport.set({
      mode: 'chaos',
      latency: { minMs: 0.1, maxMs: 0.2 },
      errorProbability: 0,
    })
    const request = jest.fn()
    const handle = executeLink(createLink(laika, request), { query }).subscribe(
      {},
    )
    await Promise.resolve()

    const [decision] = laika.transport.snapshot().decisions
    expect(decision?.latencyMs).toBeGreaterThanOrEqual(0.1)
    expect(decision?.latencyMs).toBeLessThanOrEqual(0.2)
    handle.unsubscribe()
  })

  it('skips anonymous Apollo Client 3 subscriptions in chaos mode', async () => {
    const laika = new Laika()
    laika.transport.set({
      mode: 'chaos',
      latency: { minMs: 100, maxMs: 200 },
      errorProbability: 100,
    })
    const request = jest.fn()
    const context: Record<string, unknown> = {}
    const result = laika.createLink().request(
      {
        operationName: '',
        query: anonymousSubscription,
        getContext: () => context,
        setContext: (next: Record<string, unknown>) => {
          Object.assign(context, next)
        },
      } as never,
      (operation) => {
        request(operation)
        return new Observable((observer) => {
          observer.complete?.()
        })
      },
    )

    if (!result) throw new Error('Expected Laika to return an observable')
    await waitFor(result)

    expect(request).toHaveBeenCalledTimes(1)
    expect(laika.transport.snapshot().decisions).toMatchObject([
      {
        operation: { operationType: 'subscription' },
        latencyMs: 0,
        chaosSkipped: true,
      },
    ])
  })

  it('does not forward a cancelled delayed operation', async () => {
    jest.useFakeTimers()
    const laika = new Laika()
    laika.transport.set({
      mode: 'targeted',
      rules: [
        {
          matcher: { operationName: 'GetProfile' },
          latencyMs: 25,
        },
      ],
    })
    const request = jest.fn()
    const handle = executeLink(createLink(laika, request), { query }).subscribe(
      {},
    )
    await Promise.resolve()
    handle.unsubscribe()
    await jest.advanceTimersByTimeAsync(25)

    expect(request).not.toHaveBeenCalled()
  })

  it('does not simulate mocked responses as transport requests', async () => {
    const laika = new Laika()
    laika.transport.set({
      mode: 'chaos',
      latency: { minMs: 0, maxMs: 0 },
      errorProbability: 100,
    })
    laika
      .intercept({ operationName: 'GetProfile' })
      .mockResult({ result: response })
    const request = jest.fn()

    await expect(
      waitFor(executeLink(createLink(laika, request), { query })),
    ).resolves.toMatchObject([{ values: [response] }])
    expect(request).not.toHaveBeenCalled()
    expect(laika.transport.snapshot().decisions).toEqual([])
  })
})
