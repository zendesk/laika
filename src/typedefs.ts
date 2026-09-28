/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DocumentNode } from 'graphql'
import type {
  FetchResult,
  Observable,
  Operation,
  TypedDocumentNode,
} from '@apollo/client/core'
import type { Laika } from './laika'

interface SubscriptionObserver<T> {
  closed: boolean
  next?: (value: T) => void
  error?: (errorValue: any) => void
  complete?: () => void
}

/** @ignore */
export type { FetchResult, Operation } from '@apollo/client/core'
/** @ignore */
export type Variables = Operation['variables']
/** @ignore */
export type NoInfer<T> = [T][T extends T ? 0 : never]
/** @ignore */
export type OperationDocument<TData = unknown, TVariables = Variables> =
  | DocumentNode
  | TypedDocumentNode<TData, TVariables>
/** @ignore */
export type InferResultData<TDocument> =
  TDocument extends TypedDocumentNode<infer TData, any> ? TData : unknown
/** @ignore */
export type FetchResultSubscriptionObserver = SubscriptionObserver<FetchResult>
/** @ignore */
export type NextLink = (operation: Operation) => Observable<FetchResult>
/** @ignore */
export interface Subscription {
  closed?: boolean
  unsubscribe: () => void
}

export type OnSubscribeCallback = (options: {
  operation: Operation
  observer: FetchResultSubscriptionObserver
  removeCallback: () => void
}) => (() => void) | void

export type OperationObserverCallback = (
  operation: Operation,
  observer: FetchResultSubscriptionObserver,
) => void

export interface Result<TData = unknown> {
  result?: FetchResult<TData>
  error?: Error
  /** Delay the mocked emission by this many milliseconds. */
  delay?: number
}

export type ResultFn<TData = unknown> = (
  operation: Operation,
) => Result<TData> | PromiseLike<Result<TData>>
export type ResultOrFn<TData = unknown> = Result<TData> | ResultFn<TData>

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
  operation?: OperationDocument
}

/**
 * Leave undefined if you want to intercept every operation. Otherwise provide
 * either a {@link MatcherFn | matcher function} or a {@link MatcherObject | matcher object}
 * with properties like `clientName` and/or a partial set of `variables`
 * that have to match for a given operation to be intercepted.
 */
export type Matcher = MatcherFn | MatcherObject

/** A simulated failure returned instead of calling the following transport link. */
export type TransportFailure = {
  kind: 'network' | 'graphql'
  message?: string
}

/** A targeted transport effect. The first matching rule is applied. */
export type TargetedTransportRule = {
  matcher: Matcher
  latencyMs?: number
  failure?: TransportFailure
}

/** Explicit simulation rules for selected passthrough operations. */
export type TargetedTransportSimulationOptions = {
  mode: 'targeted'
  rules: readonly TargetedTransportRule[]
}

/** Randomized simulation rules for matching passthrough operations. */
export type ChaosTransportSimulationOptions = {
  mode: 'chaos'
  /** Leave undefined to include every operation. */
  matcher?: Matcher
  /** Inclusive when both bounds are whole milliseconds. */
  latency: { minMs: number; maxMs: number }
  /** Percentage from 0 through 100. */
  errorProbability: number
  /** Off by default because subscriptions are long-lived. */
  includeSubscriptions?: boolean
}

/** Exactly one enabled transport simulation mode. */
export type TransportSimulationOptions =
  | TargetedTransportSimulationOptions
  | ChaosTransportSimulationOptions

export type TransportOperationType =
  | 'query'
  | 'mutation'
  | 'subscription'
  | 'unknown'

/** An operation observed by a Laika instance. */
export type TransportOperation = {
  operationName?: string
  operationType: TransportOperationType
  clientName?: string
  feature?: string
}

/** A bounded diagnostic record for a passthrough operation. */
export type TransportDecision = {
  id: number
  timestamp: number
  mode: TransportSimulationOptions['mode']
  operation: TransportOperation
  latencyMs: number
  chaosSkipped: boolean
  injectedFailure?: TransportFailure
}

/** The current configuration and diagnostics for a Laika instance. */
export type TransportSnapshot = {
  configuration?: TransportSimulationOptions
  operations: readonly TransportOperation[]
  decisions: readonly TransportDecision[]
}

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

export interface RecordingPointWithFixtureData extends RecordingPointWithFixtureMeta {
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
  onLaikaReady?: (laika: Laika) => void
}

// helpers
/** @ignore */
export type ArgsType<T extends (...args: any) => any> = T extends (
  ...args: infer R
) => any
  ? R
  : any
