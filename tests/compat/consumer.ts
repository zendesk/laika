import {
  ApolloLink,
  Observable,
  gql,
  type FetchResult,
  type Operation,
  type TypedDocumentNode,
} from '@apollo/client/core'
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

type HelloQueryData = {
  sample: {
    id: string
  }
}

type HelloQueryVariables = {
  includeSample: boolean
}

const typedQuery = query as TypedDocumentNode<
  HelloQueryData,
  HelloQueryVariables
>

const explicitlyTypedIntercept = laika.intercept()
explicitlyTypedIntercept.mockResult<HelloQueryData>({
  result: {
    data: {
      sample: {
        id: 'explicit',
      },
    },
  },
})

laika.intercept<HelloQueryData>({ operationName: 'helloQuery' }).mockResult({
  result: {
    data: {
      sample: {
        id: 'explicit-on-intercept',
      },
    },
  },
})

laika.intercept({ operation: typedQuery }).mockResult({
  result: {
    data: {
      sample: {
        id: 'inferred',
      },
    },
  },
})

explicitlyTypedIntercept.mockResult<HelloQueryData>({
  result: {
    data: {
      sample: {
        // @ts-expect-error `id` must stay a string when an explicit result type is provided.
        id: 1,
      },
    },
  },
})

laika.intercept({ operation: typedQuery }).mockResult({
  result: {
    data: {
      sample: {
        // @ts-expect-error `id` must stay a string when inferred from a typed document.
        id: 1,
      },
    },
  },
})

void [link, observer, options, query, typedQuery]
