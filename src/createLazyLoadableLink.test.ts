import gql from 'graphql-tag'
import { firstValueFrom, of, Subscriber } from 'rxjs'
import {
  ApolloClient,
  ApolloLink,
  execute,
  InMemoryCache,
  Observable,
} from '@apollo/client/core'
import { createLazyLoadableLink } from './createLazyLoadableLink'
import { onNextTick } from './testUtils'

const query = gql`
  query helloQuery {
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

const client = new ApolloClient({
  link: ApolloLink.empty(),
  cache: new InMemoryCache(),
})

const data = { data: { hello: 'world' } }

describe('createLazyLoadableLink', () => {
  it('returns passthrough data from the following link', async () => {
    const link = createLazyLoadableLink(
      Promise.resolve(new ApolloLink(() => of(data))),
    )
    const result = await firstValueFrom(execute(link, { query }, { client }))
    expect(result).toEqual(data)
  })

  it('correctly emits subsequent values from the following link and completes the returned Observable when the Observable returned from the lazily loaded link completes', async () => {
    let observer: Subscriber<number>
    const link = createLazyLoadableLink(
      Promise.resolve(
        new ApolloLink(
          () =>
            new Observable((obs) => {
              observer = obs as any
            }),
        ),
      ),
    )

    const outerObserver = {
      next: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
    }

    const sub = execute(link, { query: subscription }, { client }).subscribe(
      outerObserver,
    )

    expect.assertions(9)
    await onNextTick(() => {
      observer.next(1)
      expect(outerObserver.next).toHaveBeenCalledTimes(1)
      expect(outerObserver.next).toHaveBeenLastCalledWith(1)
      expect(outerObserver.complete).not.toHaveBeenCalled()
      observer.next(2)
      expect(outerObserver.next).toHaveBeenCalledTimes(2)
      expect(outerObserver.next).toHaveBeenLastCalledWith(2)
      expect(outerObserver.complete).not.toHaveBeenCalled()
      observer.complete()
      expect(outerObserver.complete).toHaveBeenCalledTimes(1)
      expect(outerObserver.next).toHaveBeenLastCalledWith(2)
      expect(outerObserver.error).not.toHaveBeenCalled()
      sub.unsubscribe()
    })
  })
})
