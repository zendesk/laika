/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApolloLink, Observable } from '@apollo/client/core'
import type { Laika } from './laika'

interface SubscriptionObserver<T> {
  closed: boolean
  next: (value: T) => void
  error: (errorValue: any) => void
  complete: () => void
}

// /** @ignore */
/** @ignore */
export type Variables = ApolloLink.Operation['variables']
/** @ignore */
export type FetchResultSubscriptionObserver =
  SubscriptionObserver<ApolloLink.Result>
/** @ignore */

export type OnSubscribeCallback = (options: {
  operation: ApolloLink.Operation
  observer: FetchResultSubscriptionObserver
  removeCallback: () => void
}) => (() => void) | void

export type OperationObserverCallback = (
  operation: ApolloLink.Operation,
  observer: FetchResultSubscriptionObserver,
) => void

export interface Result {
  result?: ApolloLink.Result
  error?: Error
}

export type ResultFn = (operation: ApolloLink.Operation) => Result
export type ResultOrFn = Result | ResultFn

export interface SubscribeMeta {
  operation: ApolloLink.Operation
  observer: FetchResultSubscriptionObserver
  forward: ApolloLink.ForwardFunction
  enablePassthrough: PassthroughEnableFn
  disablePassthrough: PassthroughDisableFn
}

export type InterceptorFn = (
  operation: ApolloLink.Operation,
  forward: ApolloLink.ForwardFunction,
) => Observable<ApolloLink.Result>

export type ManInTheMiddleFn = (
  options: SubscribeMeta,
) => Observable<ApolloLink.Result>

export type PassthroughDisableFn = () => boolean
export type PassthroughEnableFn = (mitm?: ManInTheMiddleFn) => boolean
export type OnSubscribe = (options: SubscribeMeta) => () => void
export type MatcherFn = (operation: ApolloLink.Operation) => boolean
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
  result: ApolloLink.Result
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
  onLaikaReady?: (laika: Laika) => void
}

// helpers
/** @ignore */
export type ArgsType<T extends (...args: any) => any> = T extends (
  ...args: infer R
) => any
  ? R
  : any
