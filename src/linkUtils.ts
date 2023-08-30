import isMatch from 'lodash/isMatch'
import type { Operation } from '@apollo/client/core'
import type {
  Matcher,
  MatcherFn,
  OperationObserverCallback,
  Result,
} from './typedefs'

export const getMatcherFn = (matcher?: Matcher | undefined) =>
  typeof matcher === 'function'
    ? matcher
    : typeof matcher === 'undefined'
    ? () => true
    : (operation: Operation) => {
        const operationContext = operation.getContext()
        if (
          matcher.clientName &&
          matcher.clientName !== operationContext.clientName
        ) {
          return false
        }
        if (
          matcher.operationName &&
          matcher.operationName !== operation.operationName
        ) {
          return false
        }
        if (matcher.feature && matcher.feature !== operationContext.feature) {
          return false
        }
        if (
          matcher.variables &&
          !isMatch(operation.variables, matcher.variables)
        ) {
          return false
        }
        return true
      }

export const getEmitValueFn =
  (
    result: Result,
    matcher?: MatcherFn | undefined,
  ): OperationObserverCallback =>
  (operation, observer) => {
    if (matcher && !matcher(operation)) {
      return
    }
    if (observer.closed) {
      // too late to emit anything
      return
    }
    if (result.error) {
      observer.error?.(result.error)
    } else if (result.result) {
      observer.next?.(result.result)
    } else {
      observer.error?.(
        new Error(
          `You haven't provided 'result' or 'error' properties to be pushed to the listeners of '${
            operation.operationName ?? '(anonymous operation)'
          }'! Your mock object was: ${JSON.stringify(result, null, 2)}`,
        ),
      )
    }
  }
