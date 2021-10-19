import type { DefinitionNode, OperationTypeNode } from 'graphql'
import type { Operation } from '@apollo/client'

const checkOperationType = (
  definitions: readonly DefinitionNode[],
  type: OperationTypeNode,
) =>
  definitions.some(
    (element) =>
      element.kind === 'OperationDefinition' && element.operation === type,
  )

export const hasSubscriptionOperation = (
  /** @type {Operation} */ { query }: Operation,
) => checkOperationType(query.definitions, 'subscription')

export const hasMutationOperation = (
  /** @type {Operation} */ { query }: Operation,
) => checkOperationType(query.definitions, 'mutation')

export const hasQueryOperation = (
  /** @type {Operation} */ { query }: Operation,
) => checkOperationType(query.definitions, 'query')
