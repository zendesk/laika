import memoize from 'lodash/memoize'
import { DEFAULT_GLOBAL_PROPERTY_NAME } from './constants'
import { TestingToolkitInterceptionManager } from './interceptionManager'
import type { CreateTestingToolkitLinkOptions } from './typedefs'

const getTestingToolkitSingleton = memoize(
  (
    globalPropertyName: string = DEFAULT_GLOBAL_PROPERTY_NAME,
    startLoggingImmediately: boolean = false,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access,no-multi-assign
    const singleton = ((globalThis as any)[globalPropertyName] =
      new TestingToolkitInterceptionManager({
        referenceName: globalPropertyName,
      }))

    if (startLoggingImmediately) {
      singleton.log.startLogging()
    }
    return singleton
  },
)

/**
 * Creates an instance of ApolloLink with intercepting functionality.
 * @param options
 */
export function createGlobalTestingToolkitLink({
  clientName = '__unknown__',
  globalPropertyName,
  startLoggingImmediately = false,
}: CreateTestingToolkitLinkOptions) {
  if (clientName === '__unknown__') {
    throw new Error('ApolloTestingToolkitLink: clientName is required')
  }
  const interceptionManager = getTestingToolkitSingleton(
    globalPropertyName,
    startLoggingImmediately,
  )
  return interceptionManager.createLink((operation) => {
    operation.setContext({ clientName })
  })
}
