import gql from 'graphql-tag'
import waitFor from 'wait-for-observables'
import { ApolloLink, Observable } from '@apollo/client/core'
import { createLazyLoadableLink } from './createLazyLoadableLink'
import {
  executeLink,
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

const subscription = gql`
  subscription helloSubscription {
    sample {
      id
    }
  }
`

const data = { data: { hello: 'world' } }

describe('createLazyLoadableLink', () => {
  it('returns passthrough data from the following link', async () => {
    const link = createLazyLoadableLink(
      Promise.resolve(new ApolloLink(() => observableOf(data))),
    )
    const [result] = (await waitFor(
      executeLink(link, { query }),
    )) as WaitForResult<typeof data>
    const { values } = result!
    expect(values).toEqual([data])
  })

  it('correctly emits subsequent values from the following link and completes the returned Observable when the Observable returned from the lazily loaded link completes', async () => {
    let observer: TestObserver<number> | undefined
    const link = createLazyLoadableLink(
      Promise.resolve(
        new ApolloLink(
          () =>
            new Observable<any>((obs) => {
              observer = obs as TestObserver<number>
            }),
        ),
      ),
    )

    const outerObserver = {
      next: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
    }

    const sub = executeLink(link, { query: subscription }).subscribe(
      outerObserver,
    )

    expect.assertions(9)
    await onNextTick(() => {
      const activeObserver = observer!

      activeObserver.next?.(1)
      expect(outerObserver.next).toHaveBeenCalledTimes(1)
      expect(outerObserver.next).toHaveBeenLastCalledWith(1)
      expect(outerObserver.complete).not.toHaveBeenCalled()
      activeObserver.next?.(2)
      expect(outerObserver.next).toHaveBeenCalledTimes(2)
      expect(outerObserver.next).toHaveBeenLastCalledWith(2)
      expect(outerObserver.complete).not.toHaveBeenCalled()
      activeObserver.complete?.()
      expect(outerObserver.complete).toHaveBeenCalledTimes(1)
      expect(outerObserver.next).toHaveBeenLastCalledWith(2)
      expect(outerObserver.error).not.toHaveBeenCalled()
      sub.unsubscribe()
    })
  })
})
