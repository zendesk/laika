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

type ExecuteWithOptionalContext = (
  link: ApolloLink,
  request: Parameters<typeof execute>[1],
  context?: { client: typeof testClient },
) => ReturnType<typeof execute>

const executeWithOptionalContext = execute as ExecuteWithOptionalContext

export const executeLink = (
  link: ApolloLink,
  request: Parameters<typeof execute>[1],
) =>
  // Apollo Client 4 requires an explicit client in the execute context, while
  // Apollo Client 3 still uses the two-argument signature.
  executeWithOptionalContext.length >= 3
    ? executeWithOptionalContext(link, request, { client: testClient })
    : executeWithOptionalContext(link, request)

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
