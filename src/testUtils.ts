import {
  ApolloClient,
  ApolloLink,
  execute,
  InMemoryCache,
  Observable,
} from '@apollo/client/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onNextTick = <Output, T extends (...args: any) => Output>(
  action: T,
) =>
  new Promise<Output>((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(action())
      } catch (error: unknown) {
        reject(error)
      }
    })
  })

export type WaitForResult<T> = {
  values?: T[]
  error?: unknown
}[]

export interface TestObserver<T> {
  next?: (value: T) => void
  error?: (error: unknown) => void
  complete?: () => void
}

const testClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.empty(),
})

export const executeLink = (
  link: ApolloLink,
  request: Parameters<typeof execute>[1],
) => execute(link, request, { client: testClient })

export const observableOf = <T>(...values: T[]) =>
  new Observable<T>((observer) => {
    values.forEach((value) => {
      observer.next?.(value)
    })
    observer.complete?.()
  })

export const observableError = (error: unknown) =>
  new Observable<never>((observer) => {
    observer.error?.(error)
  })
