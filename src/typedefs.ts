/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  FetchResult,
  NextLink,
  Observable,
  Operation,
} from '@apollo/client/core'

/** @ignore */
export type { FetchResult, NextLink, Operation } from '@apollo/client/core'
/** @ignore */
export type Variables = Operation['variables']
/** @ignore */
export type FetchResultSubscriptionObserver =
  ZenObservable.SubscriptionObserver<FetchResult>
/** @ignore */
export type Subscription = ZenObservable.Subscription

export type OnSubscribeCallback = (options: {
  operation: Operation
  observer: FetchResultSubscriptionObserver
  removeCallback: () => void
}) => (() => void) | void

export type OperationObserverCallback = (
  operation: Operation,
  observer: FetchResultSubscriptionObserver,
) => void

export interface Result {
  result?: FetchResult
  error?: Error
}

export type ResultFn = (operation: Operation) => Result
export type ResultOrFn = Result | ResultFn

export interface SubscribeMeta {
  operation: Operation
  observer: FetchResultSubscriptionObserver
  forward: NextLink
  enablePassthrough: PassthroughEnableFn
  disablePassthrough: PassthroughDisableFn
}

export type InterceptorFn = (
  operation: Operation,
  forward: NextLink,
) => Observable<FetchResult>

export type ManInTheMiddleFn = (
  options: SubscribeMeta,
) => Observable<FetchResult>

export type PassthroughDisableFn = () => boolean
export type PassthroughEnableFn = (mitm?: ManInTheMiddleFn) => boolean
export type OnSubscribe = (options: SubscribeMeta) => () => void
export type MatcherFn = (operation: Operation) => boolean
export interface Behavior {
  matcher: MatcherFn
  onSubscribe: OnSubscribe
}

export interface MatcherObject {
  operationName?: string
  clientName?: string
  feature?: string
  variables?: Variables
}

/** [[include:matcher.md]] */
export type Matcher = MatcherFn | MatcherObject

export type RecordingElement = RecordingMarker | RecordingPoint
export type RecordingElementWithFixtureMeta =
  | RecordingMarker
  | RecordingPointWithFixtureMeta

export type RecordingElementWithFixtureData =
  | RecordingMarker
  | RecordingPointWithFixtureData

export interface RecordingPoint {
  clientName: string
  timeDelta: number
  operationName: string | null | undefined
  feature?: string
  variables: Variables
  type: 'push' | 'response:mutation' | 'response:query'
  result: FetchResult
  action: string
}

export type Replacements = {
  key: string
  value: unknown
}[]

export interface RecordingPointWithFixtureMeta extends RecordingPoint {
  fixtureFnName: string
  reuseFixture?: string
  valueAsStringToVariableName?: Map<string, string>
  replacedVariables?: Map<string, Replacements>
  stringifiedResult?: string
}

export interface RecordingPointWithFixtureData
  extends RecordingPointWithFixtureMeta {
  fixtureFnString?: string
  fixtureFnName: string
  fixtureCallString: string
}

export interface RecordingMarker {
  type: 'marker'
  timeDelta: number
  action: string
}

export type EventFilterFn = (event: RecordingElement) => boolean

export interface CreateLaikaLinkOptions {
  clientName: string
  globalPropertyName?: string
  startLoggingImmediately?: boolean
}

// helpers
/** @ignore */
export type ArgsType<T extends (...args: any) => any> = T extends (
  ...args: infer R
) => any
  ? R
  : any
