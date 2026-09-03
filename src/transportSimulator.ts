import { ApolloLink, Observable } from '@apollo/client/core'
import { getOperationAST, GraphQLError } from 'graphql'
import type { Operation } from './typedefs'

/** A selected operation failure simulated before the following Apollo link runs. */
export type TransportFailure = {
  /** Selected operations. An empty list matches nothing. */
  operations: readonly string[]
  kind: 'network' | 'graphql'
  message?: string
}

/** A selected operation delay simulated before the following Apollo link runs. */
export type TransportLatency = {
  /** Selected operations. An empty list matches nothing. */
  operations: readonly string[]
  latencyMs: number
}

/** Explicit simulation rules for selected operations. */
export type TargetedTransportSimulatorOptions = {
  mode: 'targeted'
  latency?: TransportLatency
  fail?: TransportFailure
}

/** Randomized simulation rules for all included operations. */
export type ChaosTransportSimulatorOptions = {
  mode: 'chaos'
  /** Inclusive delay range. */
  latency: { minMs: number; maxMs: number }
  /** Percentage from 0 through 100. */
  errorProbability: number
  /** Off by default because subscriptions are long-lived. */
  includeSubscriptions?: boolean
}

/** Exactly one transport simulation mode. */
export type TransportSimulatorOptions =
  | TargetedTransportSimulatorOptions
  | ChaosTransportSimulatorOptions

export type TransportOperationType =
  | 'query'
  | 'mutation'
  | 'subscription'
  | 'unknown'

/** A diagnostic snapshot recorded when the simulator decides an operation's effects. */
export type TransportOperationLogEntry = {
  id: number
  operationName: string
  operationType: TransportOperationType
  timestamp: number
  latencyMs: number
  chaosSkipped: boolean
  injectedFailure?: {
    kind: TransportFailure['kind']
    message?: string
  }
  options: TransportSimulatorOptions
}

export type TransportSimulatorChange =
  | { kind: 'options' }
  | { kind: 'operations' }
  | { kind: 'log' }

/** Runtime control and diagnostics surface for a transport simulator instance. */
export type TransportSimulatorController = {
  get(): TransportSimulatorOptions
  set(options: TransportSimulatorOptions): void
  reset(): void
  getOperations(): readonly string[]
  getLog(): readonly TransportOperationLogEntry[]
  clearLog(): void
  subscribe(listener: (change: TransportSimulatorChange) => void): () => void
}

export type CreateTransportSimulatorOptions = {
  initial?: TransportSimulatorOptions
  /** Defaults to 100. Must be a positive integer. */
  maxLogEntries?: number
  /** Injectable to make delay behavior deterministic in tests. */
  scheduler?: { delay(delayMs: number): Promise<void> }
  /** Injectable to make chaos behavior deterministic in tests. */
  random?: () => number
}

export type TransportSimulator = {
  /** Place before the link whose operations should be simulated. */
  link: ApolloLink
  controller: TransportSimulatorController
}

const DEFAULT_OPTIONS: TargetedTransportSimulatorOptions = {
  mode: 'targeted',
}

const realScheduler = {
  delay: (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs)
    }),
}

/**
 * Creates an isolated, non-terminating Apollo link that simulates selected or
 * chaotic transport behavior and exposes runtime diagnostics.
 */
export function createTransportSimulator({
  initial = DEFAULT_OPTIONS,
  maxLogEntries = 100,
  scheduler = realScheduler,
  random = Math.random,
}: CreateTransportSimulatorOptions = {}): TransportSimulator {
  if (!Number.isInteger(maxLogEntries) || maxLogEntries < 1) {
    throw new Error(
      'Transport simulator maxLogEntries must be a positive integer',
    )
  }

  validateOptions(initial, 'initial')

  const simulatorState = createController(initial, maxLogEntries)
  const link = new ApolloLink((operation, forward) => {
    if (!forward) {
      throw new Error(
        'Transport simulator link must be followed by another Apollo link',
      )
    }

    return new Observable((observer) => {
      let active = true
      let downstream: { unsubscribe: () => void } | undefined

      const run = async () => {
        const operationName = operation.operationName ?? ''
        const operationType = getOperationType(operation)
        simulatorState.recordOperation(operationName)

        const optionSnapshot = simulatorState.controller.get()
        const effect = decideEffect(
          optionSnapshot,
          operationName,
          operationType,
          random,
        )
        simulatorState.recordOperationLog({
          operationName,
          operationType,
          timestamp: Date.now(),
          latencyMs: effect.latencyMs,
          chaosSkipped: effect.chaosSkipped,
          injectedFailure:
            effect.failure === undefined
              ? undefined
              : { kind: effect.failure.kind, message: effect.failure.message },
          options: optionSnapshot,
        })

        if (effect.latencyMs > 0) {
          await scheduler.delay(effect.latencyMs)
          if (!active) return
        }

        if (effect.failure?.kind === 'network') {
          observer.error?.(
            new Error(
              effect.failure.message ??
                `Laika transport simulator: network failure for ${operationName || '(anonymous operation)'}`,
            ),
          )
          return
        }

        if (effect.failure?.kind === 'graphql') {
          observer.next?.({
            data: null,
            errors: [
              new GraphQLError(
                effect.failure.message ??
                  `Laika transport simulator: GraphQL failure for ${operationName || '(anonymous operation)'}`,
              ),
            ],
          })
          observer.complete?.()
          return
        }

        downstream = forward(operation).subscribe({
          next: (result) => observer.next?.(result),
          error: (error: unknown) => observer.error?.(error),
          complete: () => observer.complete?.(),
        })
      }

      void run().catch((error: unknown) => {
        if (active) observer.error?.(error)
      })

      return () => {
        active = false
        downstream?.unsubscribe()
      }
    })
  })

  return { link, controller: simulatorState.controller }
}

function createController(
  configuredInitial: TransportSimulatorOptions,
  maxLogEntries: number,
): {
  controller: TransportSimulatorController
  recordOperation(operationName: string): void
  recordOperationLog(entry: Omit<TransportOperationLogEntry, 'id'>): void
} {
  const initial = cloneOptions(configuredInitial)
  let options = cloneOptions(initial)
  const operations = new Set<string>()
  const listeners = new Set<(change: TransportSimulatorChange) => void>()
  let log: TransportOperationLogEntry[] = []
  let nextLogId = 1

  const notify = (change: TransportSimulatorChange) => {
    // Consumer-owned diagnostics must never affect the transport request.
    listeners.forEach((listener) => {
      try {
        listener(change)
      } catch {
        // Ignore listener failures so a broken DevTools panel cannot break an
        // otherwise valid Apollo operation.
      }
    })
  }

  const recordOperation = (operationName: string) => {
    if (operationName.length === 0 || operations.has(operationName)) return
    operations.add(operationName)
    notify({ kind: 'operations' })
  }

  const recordOperationLog = (
    entry: Omit<TransportOperationLogEntry, 'id'>,
  ) => {
    log = [...log, cloneLogEntry({ ...entry, id: nextLogId++ })].slice(
      -maxLogEntries,
    )
    notify({ kind: 'log' })
  }

  return {
    controller: {
      get: () => cloneOptions(options),
      set: (next) => {
        validateOptions(next, 'options')
        options = cloneOptions(next)
        notify({ kind: 'options' })
      },
      reset: () => {
        options = cloneOptions(initial)
        notify({ kind: 'options' })
      },
      getOperations: () => [...operations],
      getLog: () => log.map(cloneLogEntry),
      clearLog: () => {
        if (log.length === 0) return
        log = []
        notify({ kind: 'log' })
      },
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    },
    recordOperation,
    recordOperationLog,
  }
}

function decideEffect(
  options: TransportSimulatorOptions,
  operationName: string,
  operationType: TransportOperationType,
  random: () => number,
): {
  latencyMs: number
  chaosSkipped: boolean
  failure?: Pick<TransportFailure, 'kind' | 'message'>
} {
  if (options.mode === 'targeted') {
    return {
      latencyMs: matchesOperation(options.latency?.operations, operationName)
        ? normalizeLatency(options.latency?.latencyMs)
        : 0,
      chaosSkipped: false,
      failure: matchesOperation(options.fail?.operations, operationName)
        ? options.fail
        : undefined,
    }
  }

  const chaosSkipped =
    operationType === 'subscription' && options.includeSubscriptions !== true
  if (chaosSkipped) return { latencyMs: 0, chaosSkipped }

  const minMs = normalizeLatency(options.latency.minMs)
  const maxMs = Math.max(minMs, normalizeLatency(options.latency.maxMs))
  const latencyMs = minMs + Math.floor(randomUnit(random) * (maxMs - minMs + 1))
  const errorProbability = Math.min(100, Math.max(0, options.errorProbability))
  const failure: Pick<TransportFailure, 'kind' | 'message'> | undefined =
    randomUnit(random) * 100 >= errorProbability
      ? undefined
      : { kind: randomUnit(random) < 0.5 ? 'network' : 'graphql' }

  return { latencyMs, chaosSkipped, failure }
}

function getOperationType(operation: Operation): TransportOperationType {
  return (
    getOperationAST(operation.query, operation.operationName)?.operation ??
    'unknown'
  )
}

function matchesOperation(
  operations: readonly string[] | undefined,
  operationName: string,
): boolean {
  return operations !== undefined && operations.includes(operationName)
}

function validateOptions(
  options: TransportSimulatorOptions,
  label: string,
): void {
  if (options === null || typeof options !== 'object') {
    throw new Error(
      `Transport simulator ${label}.mode must be 'targeted' or 'chaos'`,
    )
  }

  if (options.mode === 'targeted') {
    if (options.latency !== undefined) {
      validateOperationNames(
        options.latency.operations,
        `${label}.latency.operations`,
      )
      validateNonNegativeFinite(
        options.latency.latencyMs,
        `${label}.latency.latencyMs`,
      )
    }
    if (options.fail !== undefined) {
      validateOperationNames(
        options.fail.operations,
        `${label}.fail.operations`,
      )
      if (options.fail.kind !== 'network' && options.fail.kind !== 'graphql') {
        throw new Error(
          `Transport simulator ${label}.fail.kind must be 'network' or 'graphql'`,
        )
      }
      if (
        options.fail.message !== undefined &&
        typeof options.fail.message !== 'string'
      ) {
        throw new Error(
          `Transport simulator ${label}.fail.message must be a string when provided`,
        )
      }
    }
    return
  }

  if (options.mode !== 'chaos') {
    throw new Error(
      `Transport simulator ${label}.mode must be 'targeted' or 'chaos'`,
    )
  }

  validateNonNegativeFinite(options.latency.minMs, `${label}.latency.minMs`)
  validateNonNegativeFinite(options.latency.maxMs, `${label}.latency.maxMs`)
  if (options.latency.minMs > options.latency.maxMs) {
    throw new Error(
      `Transport simulator ${label}.latency.minMs must be less than or equal to ${label}.latency.maxMs`,
    )
  }
  if (
    !Number.isFinite(options.errorProbability) ||
    options.errorProbability < 0 ||
    options.errorProbability > 100
  ) {
    throw new Error(
      `Transport simulator ${label}.errorProbability must be between 0 and 100`,
    )
  }
  if (
    options.includeSubscriptions !== undefined &&
    typeof options.includeSubscriptions !== 'boolean'
  ) {
    throw new Error(
      `Transport simulator ${label}.includeSubscriptions must be a boolean when provided`,
    )
  }
}

function validateOperationNames(value: unknown, label: string): void {
  if (
    !Array.isArray(value) ||
    value.some((operationName) => typeof operationName !== 'string')
  ) {
    throw new Error(`Transport simulator ${label} must be an array of strings`)
  }
}

function validateNonNegativeFinite(value: unknown, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Transport simulator ${label} must be a finite number greater than or equal to 0`,
    )
  }
}

function normalizeLatency(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0
}

function randomUnit(random: () => number): number {
  return Math.min(1 - Number.EPSILON, Math.max(0, random()))
}

function cloneOptions(
  options: TransportSimulatorOptions,
): TransportSimulatorOptions {
  if (options.mode === 'targeted') {
    return {
      mode: 'targeted',
      latency:
        options.latency === undefined
          ? undefined
          : {
              operations: [...options.latency.operations],
              latencyMs: options.latency.latencyMs,
            },
      fail:
        options.fail === undefined
          ? undefined
          : {
              operations: [...options.fail.operations],
              kind: options.fail.kind,
              message: options.fail.message,
            },
    }
  }

  return {
    mode: 'chaos',
    latency: { minMs: options.latency.minMs, maxMs: options.latency.maxMs },
    errorProbability: options.errorProbability,
    includeSubscriptions: options.includeSubscriptions,
  }
}

function cloneLogEntry(
  entry: TransportOperationLogEntry,
): TransportOperationLogEntry {
  return {
    id: entry.id,
    operationName: entry.operationName,
    operationType: entry.operationType,
    timestamp: entry.timestamp,
    latencyMs: entry.latencyMs,
    chaosSkipped: entry.chaosSkipped,
    injectedFailure:
      entry.injectedFailure === undefined
        ? undefined
        : {
            kind: entry.injectedFailure.kind,
            message: entry.injectedFailure.message,
          },
    options: cloneOptions(entry.options),
  }
}
