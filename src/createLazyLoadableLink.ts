import { ApolloLink, Observable } from '@apollo/client'

/**
 * Creates a lazy-loadable Apollo Link.
 * Useful when you want to use a given Apollo Link in a production environment conditionally,
 * i.e. only load it when necessary.
 * @param linkPromise A Promise to an Apollo Link to wrap.
 */
export const createLazyLoadableLink = (linkPromise: Promise<ApolloLink>) =>
  new ApolloLink((operation, forward) => {
    const linkObservable: Observable<ApolloLink> = new Observable(
      (observer) => {
        void linkPromise.then(
          (link) => {
            observer.next(link)
            observer.complete()
          },
          (error) => {
            observer.error(error)
          },
        )
      },
    )
    return linkObservable.flatMap((link) => {
      const actualLinkObservable = link?.request(operation, forward)
      if (!actualLinkObservable) {
        throw new Error(
          `LazyLoadableLink: Incorrect linkPromise provided or it's request function returned null`,
        )
      }
      return actualLinkObservable
    })
  })
