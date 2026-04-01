import { ApolloLink, Observable } from '@apollo/client/core'

/**
 * Creates a lazy-loadable Apollo Link.
 * Useful when you want to use a given Apollo Link in a production environment conditionally,
 * i.e. only load it when necessary.
 * @param linkPromise A Promise to an Apollo Link to wrap.
 */
export const createLazyLoadableLink = (linkPromise: Promise<ApolloLink>) =>
  new ApolloLink(
    (operation, forward) =>
      new Observable((observer) => {
        let innerSubscription:
          | {
              unsubscribe: () => void
            }
          | undefined
        let disposed = false

        void linkPromise.then(
          (link) => {
            if (disposed) return

            const actualLinkObservable = link?.request(operation, forward)
            if (!actualLinkObservable) {
              observer.error?.(
                new Error(
                  `LazyLoadableLink: Incorrect linkPromise provided or it's request function returned null`,
                ),
              )
              return
            }

            innerSubscription = actualLinkObservable.subscribe({
              next: (result) => {
                observer.next?.(result)
              },
              error: (error) => {
                observer.error?.(error)
              },
              complete: () => {
                observer.complete?.()
              },
            })
          },
          (error) => {
            observer.error?.(error)
          },
        )

        return () => {
          disposed = true
          innerSubscription?.unsubscribe()
        }
      }),
  )
