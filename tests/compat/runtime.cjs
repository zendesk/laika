const assert = require('node:assert/strict')

const { ApolloLink, Observable, execute, gql } = require('@apollo/client/core')
const { createLazyLoadableLink } = require('@zendesk/laika')
const { Laika } = require('@zendesk/laika/cjs/laika')

const query = gql`
  query helloQuery {
    sample {
      id
    }
  }
`

const remoteData = { data: { hello: 'world' } }
const mockData = { data: { goodbye: 'world' } }

const observableOf = (value) =>
  new Observable((observer) => {
    observer.next(value)
    observer.complete()
  })

const executeLink = (link, request) => execute(link, request, { client: {} })

const collect = (observable) =>
  new Promise((resolve) => {
    const result = { values: [] }

    observable.subscribe({
      next(value) {
        result.values.push(value)
      },
      error(error) {
        resolve({ error })
      },
      complete() {
        resolve(result)
      },
    })
  })

const lazyLink = createLazyLoadableLink(
  Promise.resolve(new ApolloLink(() => observableOf(remoteData))),
)

;(async () => {
  assert.deepEqual(await collect(executeLink(lazyLink, { query })), {
    values: [remoteData],
  })

  const laika = new Laika({ referenceName: 'compatLaika' })
  const backendLink = new ApolloLink(() => observableOf(remoteData))
  const link = ApolloLink.from([laika.createLink(), backendLink])

  laika.intercept().mockResultOnce({ result: mockData })

  const [mockedResult, passthroughResult] = await Promise.all([
    collect(executeLink(link, { query })),
    collect(executeLink(link, { query })),
  ])

  assert.deepEqual(mockedResult, {
    values: [mockData],
  })
  assert.deepEqual(passthroughResult, {
    values: [remoteData],
  })
})()
