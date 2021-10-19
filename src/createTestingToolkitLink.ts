import memoize from 'lodash/memoize'
import { ApolloLink } from '@apollo/client'
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
      new TestingToolkitInterceptionManager(globalPropertyName))

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
export function createTestingToolkitLink({
  clientName = '__unknown__',
  globalPropertyName,
  startLoggingImmediately = false,
}: CreateTestingToolkitLinkOptions) {
  if (clientName === '__unknown__') {
    throw new Error('ApolloTestingToolkitLink: clientName is required')
  }
  return new ApolloLink((operation, forward) => {
    if (!forward) {
      throw new Error(
        'ApolloTestingToolkitLink cannot be used as a terminating link!',
      )
    }
    operation.setContext({ clientName })
    return getTestingToolkitSingleton(
      globalPropertyName,
      startLoggingImmediately,
    ).interceptor(operation, forward)
  })
}
