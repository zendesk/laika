/**
 * See: [how to install in your project](how-to-install.md)
 * @packageDocumentation
 * @module @zendesk/apollo-testing-toolkit-link
 */

export { createLazyLoadableTestingToolkitLink } from './createLazyLoadableApolloTestingToolkitLink'
export { createLazyLoadableLink } from './createLazyLoadableLink'
export type {
  InterceptApi,
  LogApi,
  TestingToolkitInterceptionManager,
} from './interceptionManager'
export type {
  Behavior,
  CreateTestingToolkitLinkOptions,
  EventFilterFn,
  FetchResult,
  FetchResultSubscriptionObserver,
  InterceptorFn,
  ManInTheMiddleFn,
  Matcher,
  MatcherFn,
  MatcherObject,
  NextLink,
  OnSubscribe,
  OnSubscribeCallback,
  Operation,
  OperationObserverCallback,
  PassthroughDisableFn,
  PassthroughEnableFn,
  RecordingElement,
  RecordingElementWithFixtureData,
  RecordingElementWithFixtureMeta,
  RecordingMarker,
  RecordingPoint,
  RecordingPointWithFixtureData,
  RecordingPointWithFixtureMeta,
  Result,
  ResultFn,
  ResultOrFn,
  SubscribeMeta,
  Subscription,
  Variables,
} from './typedefs'
