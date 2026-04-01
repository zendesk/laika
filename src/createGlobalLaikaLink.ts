import memoize from 'lodash/memoize'
import { DEFAULT_GLOBAL_PROPERTY_NAME } from './constants'
import { Laika } from './laika'
import type { CreateLaikaLinkOptions } from './typedefs'

export const getLaikaSingleton = memoize(
  (
    globalPropertyName: string = DEFAULT_GLOBAL_PROPERTY_NAME,
    startLoggingImmediately: boolean = false,
    onLaikaReady?: CreateLaikaLinkOptions['onLaikaReady'],
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access,no-multi-assign
    const singleton = ((globalThis as any)[globalPropertyName] = new Laika({
      referenceName: globalPropertyName,
    }))

    if (startLoggingImmediately) {
      singleton.log.startLogging()
    }

    onLaikaReady?.(singleton)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
    ;(globalThis as any)[`${globalPropertyName}ReadyCallbacks`]?.forEach(
      (fn: NonNullable<CreateLaikaLinkOptions['onLaikaReady']>) =>
        void fn(singleton),
    )

    return singleton
  },
)

/**
 * Creates an instance of ApolloLink with intercepting functionality.
 * @param options
 */
export function createGlobalLaikaLink({
  clientName = '__unknown__',
  globalPropertyName,
  startLoggingImmediately = false,
  onLaikaReady,
}: CreateLaikaLinkOptions) {
  if (clientName === '__unknown__') {
    throw new Error('LaikaLink: clientName is required')
  }
  const laika = getLaikaSingleton(
    globalPropertyName,
    startLoggingImmediately,
    onLaikaReady,
  )
  return laika.createLink((operation) => {
    operation.setContext({ clientName })
  })
}
