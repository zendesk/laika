/* eslint-disable @typescript-eslint/member-ordering,@typescript-eslint/no-shadow,max-classes-per-file */
/**
 * {@link Laika | `Laika`} is the place where most of the magic happens.
 * All the operations are routed through its Apollo Link, and Laika can decide what happens to them along the way.
 * By default every connection is passed through and no additional action is taken.
 *
 * If you're using createGlobalLaikaLink, an instance of Laika is by default installed as `laika` property
 * on the global object (most likely `window`), accessible as `window.laika`
 * or simply as `laika`.
 *
 * Key functionality:
 *
 * - {@link Laika.intercept | `laika.intercept()`}:
 *
 *   If you use `jest`, you can think of laika like the `jest` global,
 *   where the equivalent of `jest.fn()` is {@link Laika.intercept | `laika.intercept()`}
 * - {@link Laika.LogApi | `laika.log`}
 *
 *   The other thing laika is responsible for is logging.
 *
 *   Logging functionality is behind a separate API available under {@link Laika.LogApi | `laika.log`}.
 *
 * @packageDocumentation
 * @module Laika
 */
/* eslint-disable no-console */

import noop from 'lodash/noop'
import {
  ApolloLink,
  FetchResult,
  NextLink,
  Observable,
  Observer,
  Operation,
} from '@apollo/client/core'
import type { GenerateCodeOptions } from './codeGenerator'
import { generateCode } from './codeGenerator'
import { LOGGING_DISABLED_MATCHER } from './constants'
import { getLogStyle } from './getLogStyle'
import { hasMutationOperation, hasSubscriptionOperation } from './hasOperation'
import { getEmitValueFn, getMatcherFn } from './linkUtils'
import type {
  Behavior,
  EventFilterFn,
  FetchResultSubscriptionObserver,
  InterceptorFn,
  ManInTheMiddleFn,
  Matcher,
  MatcherFn,
  OnSubscribe,
  OnSubscribeCallback,
  PassthroughDisableFn,
  PassthroughEnableFn,
  RecordingElement,
  Result,
  ResultOrFn,
  SubscribeMeta,
  Subscription,
  Variables,
} from './typedefs'

const CONSOLE_PADDING = 20
const CONSOLE_SUFFIX_PADDING = 60
const CONSOLE_INTERCEPT_PADDING = 10
const CONSOLE_TYPE_PADDING = 26
const CONSOLE_TIME_SINCE_PADDING = 5
const ONE_SECOND_IN_MS = 1000

/**
 * Class responsible for managing interceptions.
 * By default a singleton is installed on `globalThis` (usually `window`) under `laika`.
 *
 * Read more in the {@link Laika | module page} or scroll down to see it's functionality.
 *
 * @example
 * ```js
 * laika.log.startLogging();
 * ```
 */
export class Laika {
  private readonly referenceName: string

  constructor({
    referenceName = 'laika',
  }: {
    referenceName?: string
  } = {}) {
    this.referenceName = referenceName
  }

  /**
   * Provides functionality to intercept, and optionally mock or modify each operation's subscription.
   * The API returned is heavily inspired on jest's mocking functionality (`jest.fn()`)
   * and is described in length here: {@link InterceptApi}.
   *
   * Every interceptor you create should be as specific as needed in a given session.
   * At the very least, ensure the order of creating interceptors is from most specific, to least specific.
   *
   * This is because any operations that are executed by your client will end up
   * being intercepted by the **first** interceptor that matches
   * the constraints of the {@link Matcher}.
   *
   * See [*Pitfalls*](pitfalls.md) for more information.
   *
   * @param matcher [[include:matcher.md]]
   * @param connectFutureLinksOrMitmFn If true, future links will still be called (e.g. reach the backend) and return responses. If set to a function, can serve for man-in-the-middle tinkering with the result.
   * @param keepNonSubscriptionConnectionsOpen If true, queries and mutations will behave a little like subscriptions, in that you will be able to fire updates even after the initial response. Experimental.
   * @example
   * ```js
   * const getActiveUsersInterceptor = laika.intercept({
   *   clientName: 'users',
   *   operationName: 'getActiveUsers',
   * });
   * ```
   */
  intercept(
    matcher?: Matcher | undefined,
    connectFutureLinksOrMitmFn:
      | (ManInTheMiddleFn | boolean)
      | undefined = false,
    keepNonSubscriptionConnectionsOpen = false,
  ): InterceptApi {
    const matcherFn: MatcherFn = getMatcherFn(matcher)

    const resultFnLimitedSet: Set<{
      resultOrFn: ResultOrFn
      matcher: MatcherFn
      repeatTimes?: number
    }> = new Set()

    const resultFnPersistentSet: Set<{
      resultOrFn: ResultOrFn
      matcher: MatcherFn
      repeatTimes?: number
    }> = new Set()

    const onSubscribeCallbacks: Set<OnSubscribeCallback> = new Set()

    let passthrough = connectFutureLinksOrMitmFn

    // we will still allow passthrough for normal requests (not subscriptions)
    // if a given request was not mocked, even when passthrough itself is falsy
    // this variable here tightens the pipe and stops the show completely:
    let passthroughFallbackAllowed = true

    const passthroughEnablers: Set<PassthroughEnableFn> = new Set()
    const passthroughDisablers: Set<PassthroughDisableFn> = new Set()

    const observerToOperationMap: Map<
      FetchResultSubscriptionObserver,
      Operation
    > = new Map()

    const calledWithVariables: Variables[] = []

    const onSubscribe: OnSubscribe = ({
      operation,
      observer,
      enablePassthrough,
      disablePassthrough,
    }) => {
      observerToOperationMap.set(observer, operation)
      passthroughEnablers.add(enablePassthrough)
      passthroughDisablers.add(disablePassthrough)
      calledWithVariables.push(operation.variables)

      const cleanupFns: ((() => void) | void)[] = [...onSubscribeCallbacks]
        .map((callback) =>
          callback({
            operation,
            observer,
            removeCallback: () => onSubscribeCallbacks.delete(callback),
          }),
        )
        .filter(Boolean)

      // sets initial passthrough state for this observer only (forwarding server responses):
      if (passthrough) {
        enablePassthrough(
          typeof passthrough === 'function' ? passthrough : undefined,
        )
      } else {
        // likely no-op:
        disablePassthrough()
      }

      let mockedResult: Result | undefined
      for (const resultGroup of [
        ...resultFnLimitedSet,
        ...resultFnPersistentSet,
      ]) {
        const { resultOrFn: thisResultOrFn, matcher } = resultGroup
        // eslint-disable-next-line no-continue
        if (!matcher(operation)) continue

        mockedResult =
          typeof thisResultOrFn === 'function'
            ? thisResultOrFn(operation)
            : thisResultOrFn
        if (typeof resultGroup.repeatTimes === 'number') {
          if (resultGroup.repeatTimes <= 1) {
            resultFnLimitedSet.delete(resultGroup)
          } else {
            resultGroup.repeatTimes--
          }
        }
        break
      }

      const queryIncludesSubscription = hasSubscriptionOperation(operation)
      if (mockedResult) {
        const emitValue = getEmitValueFn(mockedResult)
        emitValue(operation, observer)
        if (
          !queryIncludesSubscription &&
          !observer.closed &&
          !keepNonSubscriptionConnectionsOpen
        ) {
          observer.complete()
        }
      } else if (
        !passthrough &&
        !queryIncludesSubscription &&
        passthroughFallbackAllowed
      ) {
        // we want to pass through a single request, but nothing beyond that
        enablePassthrough(
          ({ disablePassthrough, forward }) =>
            new Observable((observer) => {
              // this is the equivalent of take(1), which zen-observable does not offer:
              const innerSubscription = forward(operation).subscribe({
                next: (remoteResult) => {
                  observer.next(remoteResult)
                  observer.complete()
                  innerSubscription.unsubscribe()
                  disablePassthrough()
                },
                complete: () => {
                  if (!observer.complete) observer.complete()
                },
                error: (remoteError) => {
                  observer.error(remoteError)
                },
              })
            }),
        )
      }

      return () => {
        // we're unsubscribed, i.e. a component with useQuery was unmounted
        observerToOperationMap.delete(observer)
        passthroughEnablers.delete(enablePassthrough)
        passthroughDisablers.delete(disablePassthrough)
        cleanupFns.forEach((fn) => {
          if (typeof fn === 'function') fn()
        })
      }
    }

    const behavior: Behavior = {
      matcher: matcherFn,
      onSubscribe,
    }

    const ensureBehaviorRegistered = () => {
      // any queries made from now on will be matched against this behavior:
      this.behaviors.add(behavior)

      // but there might be currently subscribed operations, we want to take over those too:
      this.unmatchedOperationOptions.forEach((subscribeMeta) => {
        if (!matcherFn(subscribeMeta.operation)) return
        this.unmatchedOperationOptions.delete(subscribeMeta)
        const cleanup = onSubscribe(subscribeMeta)
        this.cleanupFnPerSubscribeMeta.set(subscribeMeta, cleanup)
      })
    }

    ensureBehaviorRegistered()

    const enablePassthroughInAllObservers: PassthroughEnableFn = (mitm) => {
      if (!passthroughFallbackAllowed) return false
      passthrough = mitm ?? true
      const successList = [...passthroughEnablers].map((enablePassthrough) =>
        enablePassthrough(mitm),
      )
      return successList.some(Boolean)
    }

    const disablePassthroughInAllObservers: PassthroughDisableFn = () => {
      passthrough = false
      const successList = [...passthroughDisablers].map((disablePassthrough) =>
        disablePassthrough(),
      )
      return successList.some(Boolean)
    }

    // format of result should be the same as 'result' described here https://www.apollographql.com/docs/react/development-testing/testing/#defining-mocked-responses

    /**
     * See documentation of each function in {@link InterceptApi}
     */
    const interceptApi: InterceptApi = {
      get calls() {
        return [...calledWithVariables]
      },
      mockResult(resultOrFn: ResultOrFn, matcher?: Matcher | undefined) {
        ensureBehaviorRegistered()
        disablePassthroughInAllObservers()
        const matcherFn = getMatcherFn(matcher)
        resultFnPersistentSet.add({ resultOrFn, matcher: matcherFn })
        return interceptApi
      },
      mockResultOnce(resultOrFn: ResultOrFn, matcher?: Matcher | undefined) {
        ensureBehaviorRegistered()
        disablePassthroughInAllObservers()
        const matcherFn = getMatcherFn(matcher)
        resultFnLimitedSet.add({
          resultOrFn,
          matcher: matcherFn,
          repeatTimes: 1,
        })
        return interceptApi
      },
      waitForActiveSubscription() {
        ensureBehaviorRegistered()
        if (observerToOperationMap.size > 0) return undefined
        return interceptApi.waitForNextSubscription().then(noop)
      },
      async waitForNextSubscription() {
        ensureBehaviorRegistered()
        return new Promise((resolve) => {
          interceptApi.onSubscribe(({ removeCallback, ...data }) => {
            removeCallback()
            resolve(data)
          })
        })
      },
      fireSubscriptionUpdate(resultOrFn: ResultOrFn, fireMatcher?: Matcher) {
        ensureBehaviorRegistered()
        if (observerToOperationMap.size === 0) {
          const operationName =
            (typeof matcher === 'object' && matcher.operationName) ||
            (typeof fireMatcher === 'object' && fireMatcher.operationName)
          throw new Error(
            `Cannot fire a subscription update, as there is nothing listening to ${
              operationName ? `'${operationName}'.` : 'this Apollo operation.'
            }`,
          )
        }
        observerToOperationMap.forEach((operation, observer) => {
          const result =
            typeof resultOrFn === 'function'
              ? resultOrFn(operation)
              : resultOrFn
          const emitValue = getEmitValueFn(result, getMatcherFn(fireMatcher))
          emitValue(operation, observer)
        })
        return interceptApi
      },
      onSubscribe(callback: OnSubscribeCallback) {
        ensureBehaviorRegistered()
        onSubscribeCallbacks.add(callback)
        return () => {
          onSubscribeCallbacks.delete(callback)
        }
      },
      disableNetworkFallback() {
        ensureBehaviorRegistered()
        passthroughFallbackAllowed = false
      },
      allowNetworkFallback() {
        passthroughFallbackAllowed = true
      },
      mockReset() {
        resultFnLimitedSet.clear()
        resultFnPersistentSet.clear()
        onSubscribeCallbacks.clear()
        calledWithVariables.length = 0
        passthroughFallbackAllowed = true
        passthrough = connectFutureLinksOrMitmFn
        if (passthrough) {
          enablePassthroughInAllObservers(
            typeof passthrough === 'function' ? passthrough : undefined,
          )
        }
        ensureBehaviorRegistered()
        return interceptApi
      },
      mockRestore: () => {
        interceptApi.mockReset()
        enablePassthroughInAllObservers()
        this.behaviors.delete(behavior)
      },
    }
    return interceptApi
  }

  /**
   * Modify backend (or mocked) responses before they reach subscribers.
   *
   * @param matcher [[include:matcher.md]]
   * @param mapFn Mapping function to alter the responses.
   */
  modifyRemote(
    matcher: Matcher | undefined,
    mapFn: (result: FetchResult, operation: Operation) => FetchResult,
  ) {
    const interceptor = this.intercept(matcher, ({ forward, operation }) =>
      forward(operation).map((result) => mapFn(result, operation)),
    )

    return {
      restore: interceptor.mockRestore,
    }
  }

  // logging API - for documentation see end of file
  /**
   * A set of functions that controls logging and recording of all (or selected) operations.
   *
   * Read more on the {@link Laika.LogApi | LogApi} page.
   *
   * @example
   * ```js
   * laika.log.startLogging();
   * ```
   */
  log: LogApi = {
    startLogging: (matcher?: Matcher) => {
      this.loggingMatcher = getMatcherFn(matcher)
    },
    stopLogging: () => {
      this.loggingMatcher = LOGGING_DISABLED_MATCHER
    },
    startRecording: (startingActionName?: string, matcher?: Matcher) => {
      this.log.startLogging(matcher)
      this.isRecording = true
      if (startingActionName) {
        this.log.markAction(startingActionName)
      } else {
        console.log(
          `It is recommended to name your actions before you take them during the recording by calling: ${this.referenceName}.log.markAction('opening the ticket')`,
        )
      }
    },
    stopRecording: () => {
      this.isRecording = false
    },
    resetRecording: () => {
      this.recording.length = 0
    },
    markAction: (actionName: string) => {
      this.actionName = actionName
      if (this.isRecording) {
        const now = Date.now()
        if (!this.firstCaptureTimestamp) this.firstCaptureTimestamp = now
        this.recording.push({
          type: 'marker',
          timeDelta: now - this.firstCaptureTimestamp,
          action: actionName,
        })
      } else {
        throw new Error(
          `Sorry, you're not recording yet. log.startRecording() first :)`,
        )
      }
    },
    generateMockCode: (
      eventFilter?: EventFilterFn,
      options?: GenerateCodeOptions,
    ) =>
      generateCode(
        {
          recording: this.recording,
          referenceName: this.referenceName,
        },
        eventFilter,
        options,
      ),
  }

  /**
   * Use this function to create an Apollo Link that uses this Laika instance.
   * Useful in unit tests.
   * @param onRequest
   */
  createLink(onRequest?: (operation: Operation, forward: NextLink) => void) {
    return new ApolloLink((operation, forward) => {
      if (!forward) {
        throw new Error('LaikaLink cannot be used as a terminating link!')
      }
      onRequest?.(operation, forward)
      return this.interceptor(operation, forward)
    })
  }

  // private APIs below

  /**
   * @internal
   * */
  interceptor: InterceptorFn = (operation, forward) =>
    new Observable<FetchResult>((observer) => {
      // we're subscribed, e.g. a component with useQuery was mounted or a refetch was requested
      operation.setContext({
        subscribeTime: Date.now(),
        interceptMode: 'unset',
      })

      let active = true

      let passthroughSubscription: Subscription | undefined

      let lastMitm: ManInTheMiddleFn | undefined

      const disablePassthrough = () => {
        let isSuccess = false
        if (passthroughSubscription && !passthroughSubscription.closed) {
          passthroughSubscription.unsubscribe()
          isSuccess = true
        }
        passthroughSubscription = undefined
        lastMitm = undefined
        operation.setContext({ interceptMode: 'mock' })
        return isSuccess
      }

      // currently mounted components would not work until they're remounted
      // hence the need for passthrough
      const enablePassthrough = (mitm?: ManInTheMiddleFn | undefined) => {
        if (observer.closed || !active) {
          // no body is listening anymore, we can only clean-up:
          disablePassthrough()
          return false
        }

        if (passthroughSubscription) {
          if (mitm === lastMitm) {
            // no change needed, we're already subscribed to the right thing!
            return true
          }
          // we need to re-subscribe because the sniffer has changed
          // could be mitigated with a switchMap from rxjs, but we don't have rxjs 🤷‍♂️
          disablePassthrough()
        }

        // we 'unmock', i.e. we want to (re-)establish connectivity:
        const forward$ = mitm
          ? mitm({
              operation,
              forward,
              observer,
              enablePassthrough,
              disablePassthrough,
            })
          : forward(operation)

        operation.setContext({ interceptMode: mitm ? 'mitm' : 'passthrough' })
        passthroughSubscription = forward$.subscribe(observer)
        lastMitm = mitm

        return true
      }

      let cleanupFn: () => void = noop

      const subscribeMeta = {
        operation,
        observer,
        forward,
        enablePassthrough,
        disablePassthrough,
      }
      const interceptionBehavior = [...this.behaviors].find(({ matcher }) =>
        matcher(operation),
      )
      if (interceptionBehavior) {
        cleanupFn = interceptionBehavior.onSubscribe(subscribeMeta)
      } else {
        this.unmatchedOperationOptions.add(subscribeMeta)
        // until mocking starts, we want to forward everything from the backend as is:
        enablePassthrough()

        cleanupFn = () => {
          this.unmatchedOperationOptions.delete(subscribeMeta)
          const cleanup = this.cleanupFnPerSubscribeMeta.get(subscribeMeta)
          if (cleanup) cleanup()
        }
      }

      const logUnsubscribe = this.logSubscribe(subscribeMeta)

      return () => {
        logUnsubscribe()
        cleanupFn()
        disablePassthrough()
        active = false
        operation.setContext({ interceptMode: 'disposed' })
        // TODO: does it make sense to complete the observer here? `if (!o.closed) o.complete()`
      }
    }).map(this.getLogFunction({ operation, forward }))

  // interceptor-related properties:

  private readonly behaviors: Set<Behavior> = new Set()

  private readonly unmatchedOperationOptions: Set<SubscribeMeta> = new Set()

  private readonly cleanupFnPerSubscribeMeta: WeakMap<
    SubscribeMeta,
    () => void
  > = new WeakMap()

  // logging functionality:
  /**
   * @param input
   */
  private getLogFunction({
    operation,
  }: {
    operation: Operation
    forward: NextLink
  }): (result: FetchResult) => FetchResult {
    return (result) => {
      if (!this.loggingMatcher(operation)) return result

      const hasMutation = hasMutationOperation(operation)
      const type = hasSubscriptionOperation(operation)
        ? 'push'
        : hasMutation
        ? 'response:mutation'
        : 'response:query'

      const {
        clientName: unsafeClientName,
        feature: unsafeFeature,
        subscribeTime,
        interceptMode: unsafeInterceptMode,
      } = operation.getContext()
      const clientName = unsafeClientName ? String(unsafeClientName) : 'client'
      const feature = unsafeFeature ? String(unsafeFeature) : undefined
      const interceptMode = String(unsafeInterceptMode)
      const { operationName } = operation

      const now = Date.now()
      if (this.isRecording) {
        if (!this.firstCaptureTimestamp) this.firstCaptureTimestamp = now
        this.recording.push({
          clientName,
          timeDelta: now - this.firstCaptureTimestamp,
          operationName: operation.operationName,
          variables: operation.variables,
          feature,
          type,
          result,
          action: this.actionName,
        })
      }

      const timeSinceSubscribe = subscribeTime
        ? `${((now - subscribeTime) / ONE_SECOND_IN_MS).toFixed(1)}s`
        : '?s'
      const suffixText = `${operationName}${feature ? ` (${feature})` : ''}`
      console.log(
        `${
          this.isRecording ? '🔴 REC:GQL' : '🔵 LOG:GQL'
        } %c${clientName.padStart(CONSOLE_PADDING, ' ')}: ${type.padEnd(
          CONSOLE_PADDING,
          ' ',
        )} ${timeSinceSubscribe.padStart(
          CONSOLE_TIME_SINCE_PADDING,
          ' ',
        )} ${interceptMode.padEnd(
          CONSOLE_INTERCEPT_PADDING,
          ' ',
        )} ${suffixText.padEnd(CONSOLE_SUFFIX_PADDING, ' ')}\t%o`,
        getLogStyle(operationName),
        { operation, result },
      )
      return result
    }
  }

  /**
   * @param data
   */
  private logSubscribe({ operation }: SubscribeMeta): () => void {
    if (!this.loggingMatcher(operation)) return noop
    const hasMutation = hasMutationOperation(operation)
    const type = hasSubscriptionOperation(operation)
      ? 'subscription'
      : hasMutation
      ? 'mutation'
      : 'query'

    const {
      clientName: unsafeClientName,
      feature: unsafeFeature,
      interceptMode: unsafeInterceptMode,
    } = operation.getContext()
    const clientName = String(unsafeClientName)
    const feature = String(unsafeFeature)
    const interceptMode = String(unsafeInterceptMode)
    const { operationName } = operation
    if (type !== 'subscription') {
      // less noisy console
      return noop
    }
    const suffixText = `${operationName}${feature ? ` (${feature})` : ''}`
    const mainText = `${clientName.padStart(
      CONSOLE_PADDING,
      ' ',
    )}: ${type.padEnd(CONSOLE_TYPE_PADDING, ' ')} ${interceptMode.padEnd(
      CONSOLE_INTERCEPT_PADDING,
      ' ',
    )} ${suffixText.padEnd(CONSOLE_SUFFIX_PADDING, ' ')}`
    console.log(`🚀 SUB:GQL %c${mainText}\t%o`, getLogStyle(operationName), {
      operation,
    })
    return () => {
      console.log(`🏁 END:GQL %c${mainText}\t%o`, getLogStyle(operationName), {
        operation,
      })
    }
  }

  // logging-related properties:
  private loggingMatcher: MatcherFn = LOGGING_DISABLED_MATCHER

  private firstCaptureTimestamp: number | undefined

  private recording: RecordingElement[] = []

  private actionName = 'first action'

  private isRecording = false
}

export declare abstract class LogApi {
  /** @ignore */
  constructor()
  /**
   * Starts logging every matching operation and subscription to the console.
   * If you did not provide a matcher, it will log everything.
   * You will see queries, mutations, and subscription pushes along with their data.
   *
   * ![Example logging output](media://example-logging.png)
   */
  startLogging(matcher?: Matcher | undefined): void
  /**
   * Stops logging to the console.
   */
  stopLogging(): void
  /**
   * Starts the recording process. Every result will be saved until you run `log.stopRecording()`.
   *
   * ![Example recording output](media://example-recording.png)
   *
   * @param startingActionName Name what you are about to do. For example "opening a new ticket".
   * @param matcher A matcher object or function to record only the events that you are interested in, for example `{operationName: 'getColors', clientName: 'backend1'}` will record only `'getColors'` operations.
   */
  startRecording(
    startingActionName?: string | undefined,
    matcher?: Matcher | undefined,
  ): void
  /**
   * Pauses recording without clearing what was recorded so far.
   */
  stopRecording(): void
  /**
   * Resets the recording in preparation of another one.
   */
  resetRecording(): void
  /**
   * Use this function to mark a new action if recording a sequence of events.
   *
   * These will show up when you generate mock code as comments,
   * so you can more easily orient yourself in it.
   *
   * @param actionName Describe what action you will be performing, e.g. 'opening the ticket'
   * @example
   * ```js
   * log.markAction('opening the ticket');
   * // click around the site
   * log.markAction('changing the assignee');
   * ```
   */
  markAction(actionName: string): void
  /**
   * Returns a code snippet that will help you reproduce your recording without hitting actual backends.
   * @param eventFilter Optionally provide a function that will only keep the events you are interested in.
   * @param options Optionally provide code generation options to customize the output.
   */
  generateMockCode(
    eventFilter?: EventFilterFn,
    options?: GenerateCodeOptions,
  ): string
}

/**
 * This is the mocking API that is returned after running {@link Laika.intercept | `intercept()`} on the {@link Laika | Laika}.
 *
 * The API is chainable, with the exception of `mockRestore()`.
 *
 * Inspired by `jest.fn()`.
 */
export declare abstract class InterceptApi {
  /** @ignore */
  constructor()
  /**
   * An array containing the `variables` from subsequent operations that passed through this intercept.
   *
   * Similar to `jest.fn().mock.calls`.
   */
  readonly calls: readonly Variables[]
  /**
   * Sets the mock data that will be used as a default response to intercepted queries and mutations.
   * If used for subscriptions, will push data immediately.
   *
   * Similar to `jest.fn().mockReturnValue(...)`.
   *
   * @param resultOrFn [[include:result-or-fn.md]]
   * @param matcher [[include:mock-matcher.md]]
   * @example
   * Always respond with the mock to all queries/mutations intercepted
   * ```js
   * const intercept = laika.intercept({operationName: 'getUsers'});
   * intercept.mockResult(
   *   {result: {data: {users: [{id: 1, name: 'Mouse'}, {id: 2, name: 'Bamboo'}]}}},
   * );
   * ```
   * @example
   * Respond with an error, but only when the operations's variables contain `{userGroup: 'elephants'}`
   * ```js
   * const intercept = laika.intercept({operationName: 'getUsers'});
   * intercept.mockResult(
   *   {error: new Error(`oops, server blew up from all the elephants stomping!`)},
   *   {variables: {userGroup: 'elephants'}}
   * );
   * ```
   * @example
   * Respond with a customized error based on the variables:
   * ```js
   * const intercept = laika.intercept({operationName: 'getUsers'});
   * intercept.mockResult(
   *   ({variables}) => ({error: new Error(`oops, server blew up from all the ${variables.userGroup} stomping!`)})
   * );
   * ```
   */
  mockResult(
    resultOrFn: ResultOrFn,
    matcher?: Matcher | undefined,
  ): InterceptApi
  /**
   * Sets the mock data that will be used as the *next* response to matching intercepted queries/mutations.
   * If used for subscription operations, will immediately push provided data to the next matching request.
   * Works the same as {@link InterceptApi.mockResult | `mockResult`},
   * except that as soon as a matching result is found in the queue of mocks, it will not be sent again.
   *
   * Can be run multiple times and will send responses in order in which `mockResultOnce` was called.
   *
   * @param resultOrFn [[include:result-or-fn.md]]
   * @param matcher [[include:mock-matcher.md]]
   * @example
   * Respond with the mock to the first intercepted operation with the name `getUsers`,
   * then with a different mock the second time that operation is intercepted.
   * ```js
   * const intercept = laika.intercept({operationName: 'getUsers'});
   * intercept
   *   .mockResultOnce(
   *     {result: {data: {users: [{id: 1, name: 'Mouse'}, {id: 2, name: 'Bamboo'}]}}},
   *   );
   *   .mockResultOnce(
   *     {result: {data: {users: [{id: 9, name: 'Ox'}, {id: 10, name: 'Fox'}]}}},
   *   );
   * ```
   */
  mockResultOnce(
    resultOrFn: ResultOrFn,
    matcher?: Matcher | undefined,
  ): InterceptApi
  /**
   * In case of GraphQL subscriptions, will return synchronously if at least
   * one intercepted subscription is already active.
   * In other cases returns a `Promise` and behaves the same way as {@link InterceptApi.waitForNextSubscription | `waitForNextSubscription()`}.
   */
  waitForActiveSubscription(): Promise<void> | undefined
  /**
   * Returns a Promise that will resolve when the *next* operation is run.
   * This translates to whenever a query/mutation is run, or whenever the *next* subscription is made.
   */
  waitForNextSubscription(): Promise<{
    operation: Operation
    observer: Observer<FetchResult>
  }>
  /**
   * Push data to an already active `subscription`-type operation.
   * Will throw if there are no subscribers (e.g. active `useQuery` hooks).
   *
   * Works similarly to {@link InterceptApi.mockResult | `mockResult(...)`}, but the listener
   * is being fed the new data upon execution.
   *
   * Combine with {@link InterceptApi.waitForActiveSubscription | `waitForActiveSubscription()`}
   * to ensure a subscription is active before calling.
   *
   * @param resultOrFn [[include:result-or-fn.md]]
   * @param fireMatcher [[include:mock-matcher.md]]
   * @example
   * Push new information to a live feed:
   * ```js
   * const intercept = laika.intercept({operationName: 'getActiveUsersCount'});
   * await intercept.waitForActiveSubscription();
   * intercept.fireSubscriptionUpdate(
   *   {result: {data: {count: 10}}},
   * );
   * // e.g. assert the count displayed on the page is in fact 10
   * intercept.fireSubscriptionUpdate(
   *   {result: {data: {count: 0}}},
   * );
   * // e.g. assert the page shows "there are no active users currently on the page"
   * ```
   */
  fireSubscriptionUpdate(
    resultOrFn: ResultOrFn,
    fireMatcher?: Matcher,
  ): InterceptApi
  /**
   * Add a callback that will fire every time a component connects to the query (i.e. mounts).
   * You may return a clean-up function which will be run when the query disconnects.
   */
  onSubscribe(callback: OnSubscribeCallback): (() => void) | void
  /**
   * If you invoke this and do not setup any mocked results, your intercepted queries will not respond,
   * i.e. hang in a "loading" state, until you fire the data event manually
   * (e.g. in a custom callback defined in {@link InterceptApi.onSubscribe `onSubscribe(callback)`}.
   *
   * Does not affect `subscription` operations which will not reach the backend regardless of this setting (unless the `connectFutureLinksOrMitmFn` argument was set).
   *
   * Opposite of {@link InterceptApi.allowNetworkFallback `allowNetworkFallback()`}.
   */
  disableNetworkFallback(): void
  /**
   * This restores the default behavior: both queries and mutations
   * will be passed to future links (e.g. your backend) and back to the components.
   *
   * Does not affect `subscription` operations which will not reach the backend regardless of this setting (unless the `connectFutureLinksOrMitmFn` argument was set).
   *
   * Opposite of {@link InterceptApi.disableNetworkFallback `disableNetworkFallback()`}.
   */
  allowNetworkFallback(): void
  /**
   * Resets the mock configuration to its initial state and reenables the intercept if disabled by {@link InterceptApi.mockRestore `mockRestore()`}.
   */
  mockReset(): InterceptApi
  /**
   * Removes the intercept completely and re-establishes connectivity in current and _future_ intercepted operations.
   * Note the word _future_. Any connections that were established prior to running this command,
   * will not automatically switch over to other mocks. This will mostly affect subscriptions.
   * Ideally, keep a reference to the original intercept throughout the duration of your session
   * and simply `intercept.reset()` if you need to restore connectivity or setup a different scenario.
   */
  mockRestore(): void
}
