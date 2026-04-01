import gql from 'graphql-tag'
import waitFor from 'wait-for-observables'
import type { Operation } from '@apollo/client/core'
import { ApolloLink } from '@apollo/client/core'
import { DEFAULT_GLOBAL_PROPERTY_NAME } from './constants'
import { Laika } from './laika'
import {
  executeLink,
  observableError,
  observableOf,
  onNextTick,
  TestObserver,
  WaitForResult,
} from './testUtils'

const query = gql`
  query helloQuery {
    sample {
      id
    }
  }
`

const goodbyeQuery = gql`
  query goodbyeQuery {
    sample {
      id
    }
  }
`

const subscription = gql`
  subscription helloSubscription {
    sample {
      id
    }
  }
`

const standardError = new Error('I never work')

const data = { data: { hello: 'world' } }
const mockData = { data: { goodbye: 'world' } }
const mockDataImmediate = { data: { so: 'fast' } }

const createStubLink = (stub: jest.Mock) =>
  new ApolloLink((operation, forward) => stub(operation, forward))

const createDeferred = <T>() => {
  let settle: (value: T | PromiseLike<T>) => void = () => undefined
  let rejectPromise: (reason?: unknown) => void = () => undefined

  const promise = new Promise<T>((resolve, reject) => {
    settle = resolve
    rejectPromise = reject
  })

  return {
    promise,
    resolve: settle,
    reject: rejectPromise,
  }
}

describe('Laika', () => {
  it('returns passthrough data from the following link', async () => {
    const laika = new Laika({
      referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
    })
    const interceptionLink = laika.createLink()

    const backendStub = jest.fn(() => observableOf(data))
    const link = ApolloLink.from([
      interceptionLink,
      createStubLink(backendStub),
    ])
    const [result] = (await waitFor(
      executeLink(link, { query }),
    )) as WaitForResult<typeof data>
    const { values } = result!
    expect(values).toEqual([data])
    expect(backendStub).toHaveBeenCalledTimes(1)
  })

  describe('Intercept API', () => {
    it('returns mocked data and does not connect to the following link', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const backendStub = jest.fn(() => observableOf(data))
      const link = ApolloLink.from([
        interceptionLink,
        createStubLink(backendStub),
      ])
      const interceptor = laika.intercept()
      interceptor.mockResultOnce({
        result: mockData,
      })
      const [result] = (await waitFor(
        executeLink(link, { query }),
      )) as WaitForResult<unknown>
      const { values } = result!
      expect(values).toEqual([mockData])
      expect(backendStub).toHaveBeenCalledTimes(0)
    })

    it('returns mock once and then falls back to the following link - twice in a row', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const backendStub = jest.fn(() => observableOf(data))
      const link = ApolloLink.from([
        interceptionLink,
        createStubLink(backendStub),
      ])
      const interceptor = laika.intercept()

      let triedCount = 0
      while (++triedCount <= 2) {
        interceptor.mockResultOnce({
          result: mockData,
        })
        // eslint-disable-next-line no-await-in-loop
        const [result1, result2] = (await waitFor(
          executeLink(link, { query }),
          executeLink(link, { query }),
        )) as WaitForResult<unknown>
        const { values: mockValues } = result1!
        const { values: remoteValues } = result2!
        expect(mockValues).toEqual([mockData])
        expect(remoteValues).toEqual([data])
        expect(backendStub).toHaveBeenCalledTimes(triedCount)
      }
    })

    it('waits for async mocked query results before emitting and completing', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const deferred = createDeferred<{ result: typeof mockData }>()
      const backendStub = jest.fn(() => observableOf(data))
      const link = ApolloLink.from([
        interceptionLink,
        createStubLink(backendStub),
      ])
      const interceptor = laika.intercept()
      interceptor.mockResultOnce(() => deferred.promise)

      const observer = {
        next: jest.fn(),
        complete: jest.fn(),
        error: jest.fn(),
      }

      executeLink(link, { query }).subscribe(observer)

      expect(observer.next).not.toHaveBeenCalled()
      expect(observer.complete).not.toHaveBeenCalled()

      deferred.resolve({ result: mockData })

      await onNextTick(() => {
        expect(observer.next).toHaveBeenCalledTimes(1)
        expect(observer.next).toHaveBeenCalledWith(mockData)
        expect(observer.complete).toHaveBeenCalledTimes(1)
        expect(observer.error).not.toHaveBeenCalled()
        expect(backendStub).toHaveBeenCalledTimes(0)
      })
    })

    it('forwards async mocked query rejections to observer.error', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const deferred = createDeferred<never>()
      const backendStub = jest.fn(() => observableOf(data))
      const link = ApolloLink.from([
        interceptionLink,
        createStubLink(backendStub),
      ])
      const interceptor = laika.intercept()
      interceptor.mockResultOnce(() => deferred.promise)

      const observer = {
        next: jest.fn(),
        complete: jest.fn(),
        error: jest.fn(),
      }

      executeLink(link, { query }).subscribe(observer)

      const asyncError = new Error('Async mock failed')
      deferred.reject(asyncError)

      await onNextTick(() => {
        expect(observer.error).toHaveBeenCalledTimes(1)
        expect(observer.error).toHaveBeenCalledWith(asyncError)
        expect(observer.next).not.toHaveBeenCalled()
        expect(observer.complete).not.toHaveBeenCalled()
        expect(backendStub).toHaveBeenCalledTimes(0)
      })
    })

    it('delays mocked query results when delay is provided', () => {
      jest.useFakeTimers()

      try {
        const laika = new Laika({
          referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
        })
        const interceptionLink = laika.createLink()

        const backendStub = jest.fn(() => observableOf(data))
        const link = ApolloLink.from([
          interceptionLink,
          createStubLink(backendStub),
        ])
        const interceptor = laika.intercept()
        interceptor.mockResultOnce({
          result: mockData,
          delay: 250,
        })

        const observer = {
          next: jest.fn(),
          complete: jest.fn(),
          error: jest.fn(),
        }

        executeLink(link, { query }).subscribe(observer)

        expect(observer.next).not.toHaveBeenCalled()
        jest.advanceTimersByTime(249)
        expect(observer.next).not.toHaveBeenCalled()

        jest.advanceTimersByTime(1)
        expect(observer.next).toHaveBeenCalledTimes(1)
        expect(observer.next).toHaveBeenCalledWith(mockData)
        expect(observer.complete).toHaveBeenCalledTimes(1)
        expect(observer.error).not.toHaveBeenCalled()
        expect(backendStub).toHaveBeenCalledTimes(0)
      } finally {
        jest.useRealTimers()
      }
    })

    it('connects to a mocked subscription without connecting to the following link and immediately fires mocked data', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const mockedResultFn = jest.fn(() => ({ result: mockDataImmediate }))
      const backendStub = jest.fn(() => observableOf(data))
      const link = ApolloLink.from([
        interceptionLink,
        createStubLink(backendStub),
      ])

      const interceptor = laika.intercept()

      // testing that this will get pushed immediately
      interceptor.mockResultOnce(mockedResultFn)

      const observer = {
        next: jest.fn(),
        complete: jest.fn(),
        error: jest.fn(),
      }

      const sub = executeLink(link, { query: subscription }).subscribe(observer)
      expect.assertions(7)

      await onNextTick(() => {
        expect(mockedResultFn).toHaveBeenCalledTimes(1)
        expect(observer.next).toHaveBeenCalledTimes(1)
        expect(observer.next).toHaveBeenCalledWith(mockDataImmediate)
        expect(observer.complete).not.toHaveBeenCalled()
        expect(backendStub).toHaveBeenCalledTimes(0)
        sub.unsubscribe()
        expect(observer.complete).not.toHaveBeenCalled()
        expect(observer.error).not.toHaveBeenCalled()
      })
    })

    it('connects to a mocked subscription without connecting to the following link, then fires a mock update', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const backendStub = jest.fn(() => observableOf(data))
      const link = ApolloLink.from([
        interceptionLink,
        createStubLink(backendStub),
      ])

      const interceptor = laika.intercept()

      const observer = {
        next: jest.fn(),
        complete: jest.fn(),
        error: jest.fn(),
      }

      expect.assertions(7)

      const sub = executeLink(link, { query: subscription }).subscribe(observer)

      await onNextTick(() => {
        expect(observer.next).not.toHaveBeenCalled()
        interceptor.fireSubscriptionUpdate({ result: mockData })
        expect(observer.next).toHaveBeenCalledTimes(1)
        expect(observer.next).toHaveBeenCalledWith(mockData)
        expect(observer.complete).not.toHaveBeenCalled()
        expect(backendStub).toHaveBeenCalledTimes(0)
        sub.unsubscribe()
        expect(observer.complete).not.toHaveBeenCalled()
        expect(observer.error).not.toHaveBeenCalled()
      })
    })

    it('waitForActiveSubscription generates a Promise when no current active subscription, which resolves once one is made', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const backendStub = jest.fn(() => observableOf(data))
      const link = ApolloLink.from([
        interceptionLink,
        createStubLink(backendStub),
      ])

      const interceptor = laika.intercept()

      const observer = {
        next: jest.fn(),
        complete: jest.fn(),
        error: jest.fn(),
      }

      expect.assertions(3)

      const hasSettled = jest.fn()
      const waitPromise = interceptor.waitForActiveSubscription()

      expect(waitPromise).toBeInstanceOf(Promise)
      void waitPromise!.then(hasSettled)

      await onNextTick(() => {
        expect(hasSettled).not.toHaveBeenCalled()
      })

      const sub = executeLink(link, { query: subscription }).subscribe(observer)

      await onNextTick(() => {
        expect(hasSettled).toHaveBeenCalled()
        sub.unsubscribe()
      })
    })

    describe('intercept with a matcher', () => {
      it.each([
        ['MatcherObject (operationName)', { operationName: 'goodbyeQuery' }],
        ['MatcherObject (operation)', { operation: goodbyeQuery }],
        ['MatcherObject (variables)', { variables: { type: 'goodbye' } }],
        [
          'MatcherFn',
          (operation: Operation) => operation.operationName === 'goodbyeQuery',
        ],
      ])(
        'correctly intercepts only operations matched by %s and leaves other alone',
        async (_, matcher) => {
          const laika = new Laika({
            referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
          })
          const interceptionLink = laika.createLink()

          const backendStub = jest.fn(() => observableOf(data))
          const link = ApolloLink.from([
            interceptionLink,
            createStubLink(backendStub),
          ])
          const interceptor = laika.intercept(matcher)
          interceptor.mockResultOnce({
            result: mockData,
          })
          const [result1, result2] = (await waitFor(
            executeLink(link, { query }),
            executeLink(link, {
              query: goodbyeQuery,
              variables: { type: 'goodbye' },
            }),
          )) as WaitForResult<unknown>
          const { values } = result1!
          const { values: goodbyeValues } = result2!
          expect(values).toEqual([data])
          expect(goodbyeValues).toEqual([mockData])
          expect(backendStub).toHaveBeenCalledTimes(1)
        },
      )
    })
  })

  it('calls unsubscribe on the appropriate downstream observable', async () => {
    const laika = new Laika({
      referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
    })
    const interceptionLink = laika.createLink()

    const unsubscribeStub = jest.fn()
    // Hold the test hostage until we're hit
    let underlyingObservable: any
    const untilSubscribed = new Promise((resolve) => {
      underlyingObservable = {
        subscribe(observer: TestObserver<typeof data>) {
          resolve(undefined) // Release hold on test.
          void Promise.resolve().then(() => {
            observer.next?.(data)
            observer.complete?.()
          })
          return { unsubscribe: unsubscribeStub, closed: false }
        },
      }
    })

    const backendStub = jest.fn()
    backendStub.mockReturnValueOnce(underlyingObservable!)
    const link = ApolloLink.from([
      interceptionLink,
      createStubLink(backendStub),
    ])
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const subscription = executeLink(link, { query }).subscribe({})
    await untilSubscribed
    subscription.unsubscribe()
    expect(unsubscribeStub).toHaveBeenCalledTimes(1)
  })

  it('supports multiple subscribers to the same request', async () => {
    const laika = new Laika({
      referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
    })
    const interceptionLink = laika.createLink()

    const stub = jest.fn()
    stub.mockReturnValueOnce(observableError(standardError))
    stub.mockReturnValueOnce(observableError(standardError))
    stub.mockReturnValueOnce(observableOf(data))
    const link = ApolloLink.from([interceptionLink, createStubLink(stub)])
    const observable = executeLink(link, { query })
    const [result1, result2, result3] = (await waitFor(
      observable,
      observable,
      observable,
    )) as any

    expect(result1).toEqual({ error: standardError })
    expect(result2).toEqual({ error: standardError })
    expect(result3.values).toEqual([data])
    expect(stub).toHaveBeenCalledTimes(3)
  })
})
