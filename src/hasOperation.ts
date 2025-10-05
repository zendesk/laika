import type { DefinitionNode, OperationTypeNode } from 'graphql'
import type { ApolloLink } from '@apollo/client/core'

const checkOperationType = (
  definitions: readonly DefinitionNode[],
  type: OperationTypeNode,
) =>
  definitions.some(
    (element) =>
      element.kind === 'OperationDefinition' && element.operation === type,
  )

export const hasSubscriptionOperation = (
  /** @type {Operation} */ { query }: ApolloLink.Operation,
) => checkOperationType(query.definitions, 'subscription' as OperationTypeNode)

export const hasMutationOperation = (
  /** @type {Operation} */ { query }: ApolloLink.Operation,
) => checkOperationType(query.definitions, 'mutation' as OperationTypeNode)

export const hasQueryOperation = (
  /** @type {Operation} */ { query }: ApolloLink.Operation,
) => checkOperationType(query.definitions, 'query' as OperationTypeNode)
