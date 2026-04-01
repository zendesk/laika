import {
  ApolloClient,
  ApolloLink,
  gql,
  InMemoryCache,
  Observable,
} from '@apollo/client'
import { Laika } from './laika'

const realData = {
  data: { sample: 'not mocked' },
}
const mockedData = {
  data: { sample: 'mocked' },
}
const alternateMockedData = { data: { sample: 'also mocked' } }

const query = gql`
  query sampleQuery {
    sample
  }
`

const subscriptionQuery = gql`
  subscription sampleSubscription {
    number
  }
`

const sampleLink = new ApolloLink(
  () =>
    new Observable((observer) => {
      observer.next(realData)
      observer.complete()
    }),
)

const setup = () => {
  const laika = new Laika()
  const link = laika.createLink()
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([link, sampleLink]),
    defaultOptions: { query: { fetchPolicy: 'no-cache' } },
  })

  return [laika, client] as const
}

describe('Apollo Client integration', () => {
  it('returns the original value when not mocked', async () => {
    const [laika, client] = setup()

    const intercept = laika.intercept()

    expect.assertions(3)

    await expect(client.query({ query })).resolves.toMatchObject(realData)
    await expect(client.query({ query })).resolves.toMatchObject(realData)
    expect(intercept.calls).toHaveLength(2)
  })

  it('returns a mocked value with mockResult', async () => {
    const [laika, client] = setup()

    const intercept = laika.intercept()
    intercept.mockResult({ result: mockedData })

    expect.assertions(3)

    await expect(client.query({ query })).resolves.toMatchObject(mockedData)
    await expect(client.query({ query })).resolves.toMatchObject(mockedData)
    expect(intercept.calls).toHaveLength(2)
  })

  it('returns queued mockResultOnce values before falling back', async () => {
    const [laika, client] = setup()

    const intercept = laika.intercept()
    intercept
      .mockResultOnce({ result: mockedData })
      .mockResultOnce({ result: alternateMockedData })

    expect.assertions(4)

    await expect(client.query({ query })).resolves.toMatchObject(mockedData)
    await expect(client.query({ query })).resolves.toMatchObject(
      alternateMockedData,
    )
    await expect(client.query({ query })).resolves.toMatchObject(realData)
    expect(intercept.calls).toHaveLength(3)
  })

  it('supports mockResultOnce followed by a persistent mockResult', async () => {
    const [laika, client] = setup()

    const intercept = laika.intercept()
    intercept
      .mockResultOnce({ result: mockedData })
      .mockResult({ result: alternateMockedData })

    expect.assertions(4)

    await expect(client.query({ query })).resolves.toMatchObject(mockedData)
    await expect(client.query({ query })).resolves.toMatchObject(
      alternateMockedData,
    )
    await expect(client.query({ query })).resolves.toMatchObject(
      alternateMockedData,
    )
    expect(intercept.calls).toHaveLength(3)
  })

  it('rejects queries with mocked errors', async () => {
    const [laika, client] = setup()

    const intercept = laika.intercept()
    intercept.mockResult({ error: new Error('An error occurred') })

    await expect(client.query({ query })).rejects.toThrow('An error occurred')
  })

  it('modifies remote results', async () => {
    const [laika, client] = setup()

    const enhancedQuery = gql`
      query sampleQuery {
        sample
        modifiedValue
      }
    `

    expect.assertions(3)

    laika.modifyRemote({ operationName: 'sampleQuery' }, (result, operation) => {
      expect(result).toMatchObject(realData)
      expect(operation.operationName).toBe('sampleQuery')

      return {
        ...result,
        data: {
          ...result.data,
          modifiedValue: 'present',
        },
      }
    })

    await expect(client.query({ query: enhancedQuery })).resolves.toMatchObject({
      data: { modifiedValue: 'present', sample: 'not mocked' },
    })
  })

  it('pushes subscription updates and errors', async () => {
    const [laika, client] = setup()

    const intercept = laika.intercept()
    const next = jest.fn()

    const subscription = client.subscribe({ query: subscriptionQuery }).subscribe({
      next,
    })

    await intercept.waitForActiveSubscription()

    intercept.fireSubscriptionUpdate({
      result: {
        data: { number: 1 },
      },
    })
    intercept.fireSubscriptionUpdate({
      result: {
        data: { number: 2 },
      },
    })
    intercept.fireSubscriptionUpdate({
      error: new Error('An error occurred'),
    })

    expect(next).toHaveBeenNthCalledWith(1, { data: { number: 1 } })
    expect(next).toHaveBeenNthCalledWith(2, { data: { number: 2 } })
    expect(next).toHaveBeenCalledTimes(3)
    expect(next.mock.calls[2]?.[0]).toMatchObject({
      error: new Error('An error occurred'),
    })

    subscription.unsubscribe()
  })
})
