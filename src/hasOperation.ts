import type { DefinitionNode, DocumentNode, OperationTypeNode } from 'graphql'
import { print } from 'graphql'
import type { Operation } from '@apollo/client/core'

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
) => checkOperationType(query.definitions, 'subscription' as OperationTypeNode)

export const hasMutationOperation = (
  /** @type {Operation} */ { query }: Operation,
) => checkOperationType(query.definitions, 'mutation' as OperationTypeNode)

export const hasQueryOperation = (
  /** @type {Operation} */ { query }: Operation,
) => checkOperationType(query.definitions, 'query' as OperationTypeNode)

export const getOperationNameFromDocument = (document: DocumentNode) =>
  document.definitions.find(
    (
      definition,
    ): definition is Extract<DefinitionNode, { kind: 'OperationDefinition' }> =>
      definition.kind === 'OperationDefinition',
  )?.name?.value

export const matchesOperationDocument = (
  operationDocument: DocumentNode,
  matcherDocument: DocumentNode,
) =>
  operationDocument === matcherDocument ||
  print(operationDocument) === print(matcherDocument)
