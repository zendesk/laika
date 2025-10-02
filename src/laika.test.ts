import gql from 'graphql-tag'
import { firstValueFrom, lastValueFrom, Observer, of, take } from 'rxjs'
import {
  ApolloClient,
  ApolloLink,
  execute,
  HttpLink,
  InMemoryCache,
  // fromError,
  Observable,
  // Observer,
  // Operation,
} from '@apollo/client/core'
import { DEFAULT_GLOBAL_PROPERTY_NAME } from './constants'
import { Laika } from './laika'
import { onNextTick, WaitForResult } from './testUtils'

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

jest.setTimeout(1_000)

const client = new ApolloClient({
  link: ApolloLink.empty(),
  cache: new InMemoryCache(),
})

describe('Laika', () => {
  it('returns passthrough data from the following link', async () => {
    const laika = new Laika({
      referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
    })
    const interceptionLink = laika.createLink()

    const backendStub = new ApolloLink(() => of(data))
    const backendStubSpy = jest.spyOn(backendStub, 'request')

    const link = ApolloLink.from([interceptionLink, backendStub])

    const result = await lastValueFrom(execute(link, { query }, { client }))

    expect(result).toEqual(data)
    expect(backendStubSpy).toHaveBeenCalledTimes(1)
  })

  describe('Intercept API', () => {
    it('returns mocked data and does not connect to the following link', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const backendStub = new ApolloLink(() => of(data))
      const backendStubSpy = jest.spyOn(backendStub, 'request')

      const link = ApolloLink.from([interceptionLink, backendStub])
      const interceptor = laika.intercept()
      interceptor.mockResultOnce({
        result: mockData,
      })
      const result = await lastValueFrom(execute(link, { query }, { client }))
      expect(result).toEqual(mockData)
      expect(backendStubSpy).toHaveBeenCalledTimes(0)
    })

    it('returns mock once and then falls back to the following link - twice in a row', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const backendStub = new ApolloLink(() => of(data))
      const backendStubSpy = jest.spyOn(backendStub, 'request')
      const link = ApolloLink.from([interceptionLink, backendStub])
      const interceptor = laika.intercept()

      let triedCount = 0
      while (++triedCount <= 2) {
        interceptor.mockResultOnce({
          result: mockData,
        })

        const observable = execute(link, { query }, { client }).pipe(take(2))

        // eslint-disable-next-line no-await-in-loop
        const [mockedResult, unmockedResult] = await Promise.all([
          firstValueFrom(observable),
          lastValueFrom(observable),
        ])

        expect(mockedResult).toEqual(mockData)
        expect(unmockedResult).toEqual(data)
        expect(backendStubSpy).toHaveBeenCalledTimes(triedCount)
      }
    })

    it('connects to a mocked subscription without connecting to the following link and immediately fires mocked data', async () => {
      const laika = new Laika({
        referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
      })
      const interceptionLink = laika.createLink()

      const mockedResultFn = jest.fn(() => ({ result: mockDataImmediate }))
      const backendStub = new ApolloLink(() => of(data))
      const backendStubSpy = jest.spyOn(backendStub, 'request')
      const link = ApolloLink.from([interceptionLink, backendStub])

      const interceptor = laika.intercept()

      // testing that this will get pushed immediately
      interceptor.mockResultOnce(mockedResultFn)

      const observer = {
        next: jest.fn(),
        complete: jest.fn(),
        error: jest.fn(),
      }

      const sub = execute(link, { query: subscription }, { client }).subscribe(
        observer,
      )
      expect.assertions(7)

      await onNextTick(() => {
        expect(mockedResultFn).toHaveBeenCalledTimes(1)
        expect(observer.next).toHaveBeenCalledTimes(1)
        expect(observer.next).toHaveBeenCalledWith(mockDataImmediate)
        expect(observer.complete).not.toHaveBeenCalled()
        expect(backendStubSpy).toHaveBeenCalledTimes(0)
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

      const backendStub = new ApolloLink(() => of(data))
      const backendStubSpy = jest.spyOn(backendStub, 'request')
      const link = ApolloLink.from([interceptionLink, backendStub])

      const interceptor = laika.intercept()

      const observer = {
        next: jest.fn(),
        complete: jest.fn(),
        error: jest.fn(),
      }

      expect.assertions(7)

      const sub = execute(link, { query: subscription }, { client }).subscribe(
        observer,
      )

      await onNextTick(() => {
        expect(observer.next).not.toHaveBeenCalled()
        interceptor.fireSubscriptionUpdate({ result: mockData })
        expect(observer.next).toHaveBeenCalledTimes(1)
        expect(observer.next).toHaveBeenCalledWith(mockData)
        expect(observer.complete).not.toHaveBeenCalled()
        expect(backendStubSpy).toHaveBeenCalledTimes(0)
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

      const backendStub = new ApolloLink(() => of(data))
      const link = ApolloLink.from([interceptionLink, backendStub])

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

      const sub = execute(link, { query: subscription }, { client }).subscribe(
        observer,
      )

      await onNextTick(() => {
        expect(hasSettled).toHaveBeenCalled()
        sub.unsubscribe()
      })
    })
  })

  describe('intercept with a matcher', () => {
    it.each([
      ['MatcherObject (operationName)', { operationName: 'goodbyeQuery' }],
      ['MatcherObject (variables)', { variables: { type: 'goodbye' } }],
      [
        'MatcherFn',
        (operation: ApolloLink.Operation) =>
          operation.operationName === 'goodbyeQuery',
      ],
    ])(
      'correctly intercepts only operations matched by %s and leaves other alone',
      async (_, matcher) => {
        const laika = new Laika({
          referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
        })
        const interceptionLink = laika.createLink()
        const backendStub = new ApolloLink(() => of(data))
        const backendStubSpy = jest.spyOn(backendStub, 'request')
        const link = ApolloLink.from([interceptionLink, backendStub])
        const interceptor = laika.intercept(matcher)
        interceptor.mockResultOnce({
          result: mockData,
        })
        const [helloResult, goodbyeResult] = await Promise.all([
          lastValueFrom(execute(link, { query }, { client })),
          lastValueFrom(
            execute(
              link,
              {
                query: goodbyeQuery,
                variables: { type: 'goodbye' },
              },
              { client },
            ),
          ),
        ])
        expect(helloResult).toEqual(data)
        expect(goodbyeResult).toEqual(mockData)
        expect(backendStubSpy).toHaveBeenCalledTimes(1)
      },
    )
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
          subscribe(observer: Observer<typeof data>) {
            resolve(undefined) // Release hold on test.
            void Promise.resolve().then(() => {
              observer.next(data)
              observer.complete()
            })
            return { unsubscribe: unsubscribeStub, closed: false }
          },
        }
      })
      const backendStub = new ApolloLink(() => underlyingObservable)
      const link = ApolloLink.from([interceptionLink, backendStub])
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const subscription = execute(link, { query }, { client }).subscribe({})
      await untilSubscribed
      subscription.unsubscribe()
      expect(unsubscribeStub).toHaveBeenCalledTimes(1)
    })
    // it('supports multiple subscribers to the same request', async () => {
    //   const laika = new Laika({
    //     referenceName: DEFAULT_GLOBAL_PROPERTY_NAME,
    //   })
    //   const interceptionLink = laika.createLink()
    //   const stub = jest.fn()
    //   stub.mockReturnValueOnce(fromError(standardError))
    //   stub.mockReturnValueOnce(fromError(standardError))
    //   stub.mockReturnValueOnce(Observable.of(data))
    //   const link = ApolloLink.from([interceptionLink, stub as any])
    //   const observable = execute(link, { query })
    //   const [result1, result2, result3] = (await waitFor(
    //     observable,
    //     observable,
    //     observable,
    //   )) as any
    //   expect(result1).toEqual({ error: standardError })
    //   expect(result2).toEqual({ error: standardError })
    //   expect(result3.values).toEqual([data])
    //   expect(stub).toHaveBeenCalledTimes(3)
  })
})
