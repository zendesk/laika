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
    sample {
      id
    }
  }
`

const sampleLink = new ApolloLink(
  (_query) =>
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

describe('integration tests', () => {
  it('returns the original value when not mocked', async () => {
    const [laika, client] = setup()

    const intercept = laika.intercept()

    expect.assertions(3)
    // Unmocked return
    await expect(client.query({ query })).resolves.toMatchObject(realData)
    // Once more to be certain
    await expect(client.query({ query })).resolves.toMatchObject(realData)
    // Ensure intercept was called
    expect(intercept.calls).toHaveLength(2)
  })

  describe('mockResult', () => {
    it('returns the mocked value', async () => {
      const [laika, client] = setup()

      const intercept = laika.intercept()
      intercept.mockResult({ result: mockedData })

      expect.assertions(3)
      // Mocked return
      await expect(client.query({ query })).resolves.toMatchObject(mockedData)
      // Once more to be certain
      await expect(client.query({ query })).resolves.toMatchObject(mockedData)
      expect(intercept.calls).toHaveLength(2)
    })
  })

  describe('mockResultOnce', () => {
    it('returns the mocked value once for each mockResultOnce', async () => {
      const [laika, client] = setup()

      const intercept = laika.intercept()
      intercept
        .mockResultOnce({ result: mockedData })
        .mockResultOnce({ result: alternateMockedData })

      expect.assertions(4)
      // First mockResultOnce
      await expect(client.query({ query })).resolves.toMatchObject(mockedData)
      // Second mockResultOnce
      await expect(client.query({ query })).resolves.toMatchObject(
        alternateMockedData,
      )
      // No longer mocked
      await expect(client.query({ query })).resolves.toMatchObject(realData)
      expect(intercept.calls).toHaveLength(3)
    })

    it('can be mockedOnce and then mocked indefinitely', async () => {
      const [laika, client] = setup()

      const intercept = laika.intercept()
      intercept
        .mockResultOnce({ result: mockedData })
        .mockResult({ result: alternateMockedData })

      expect.assertions(4)
      // First mockResultOnce
      await expect(client.query({ query })).resolves.toMatchObject(mockedData)
      // Mocked indefinitely
      await expect(client.query({ query })).resolves.toMatchObject(
        alternateMockedData,
      )
      // Once more to be certain
      await expect(client.query({ query })).resolves.toMatchObject(
        alternateMockedData,
      )
      expect(intercept.calls).toHaveLength(3)
    })
  })

  describe('modifyRemote', () => {
    it('modifies the remote result', async () => {
      expect.assertions(2)

      const [laika, client] = setup()

      laika.modifyRemote(
        { operationName: 'sampleQuery' },
        (result, operation) => {
          expect(operation).toMatchObject({
            extensions: {},
            operationName: 'sampleQuery',
            query: {
              definitions: [
                {
                  directives: [],
                  kind: 'OperationDefinition',
                  name: { kind: 'Name', value: 'sampleQuery' },
                  operation: 'query',
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        alias: undefined,
                        arguments: [],
                        directives: [],
                        kind: 'Field',
                        name: { kind: 'Name', value: 'sample' },
                        selectionSet: undefined,
                      },
                      {
                        alias: undefined,
                        arguments: [],
                        directives: [],
                        kind: 'Field',
                        name: { kind: 'Name', value: 'modifiedValue' },
                        selectionSet: undefined,
                      },
                    ],
                  },
                  variableDefinitions: [],
                },
              ],
              kind: 'Document',
              loc: { end: 86, start: 0 },
            },
            variables: {},
          })
          return {
            ...result,
            data: {
              ...result.data,
              modifiedValue: 'present',
            },
          }
        },
      )

      const enhancedSampleQuery = gql`
        query sampleQuery {
          sample
          modifiedValue
        }
      `

      await expect(
        client.query({ query: enhancedSampleQuery }),
      ).resolves.toMatchObject({
        data: { modifiedValue: 'present', sample: 'not mocked' },
      })
    })
  })
})
