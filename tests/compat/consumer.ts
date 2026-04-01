import { ApolloLink, Observable, gql } from '@apollo/client/core'
import type { FetchResult, Operation } from '@apollo/client/core'
import {
  createLazyLoadableLink,
  type CreateLaikaLinkOptions,
  type FetchResultSubscriptionObserver,
  type Matcher,
  type NextLink,
  type ResultFn,
} from '@zendesk/laika'
import { Laika } from '@zendesk/laika/esm/laika'

const matcher: Matcher = (operation: Operation) =>
  operation.operationName === 'helloQuery'

const forward: NextLink = (operation) =>
  new Observable<FetchResult>((observer) => {
    observer.next?.({ data: { operationName: operation.operationName } })
    observer.complete?.()
  })

const resultFn: ResultFn = async (operation) => ({
  result: { data: { operationName: operation.operationName } },
})

const options: CreateLaikaLinkOptions = {
  clientName: 'compat-client',
}

const observer: FetchResultSubscriptionObserver = {
  closed: false,
  next: (result) => {
    void result
  },
}

const lazyLink = createLazyLoadableLink(
  Promise.resolve(new ApolloLink((operation) => forward(operation))),
)

const laika = new Laika({ referenceName: 'compatLaika' })
const intercept = laika.intercept(matcher)

intercept
  .mockResultOnce(resultFn)
  .mockResult({ result: { data: { delayed: true } }, delay: 1 })
  .onSubscribe(({ observer: activeObserver }) => {
    activeObserver.next?.({ data: { ready: true } })
  })

const link = ApolloLink.from([
  laika.createLink((operation, next) => {
    operation.setContext({ options })
    next(operation)
  }),
  lazyLink,
])

const query = gql`
  query helloQuery {
    sample {
      id
    }
  }
`

void [link, observer, options, query]
