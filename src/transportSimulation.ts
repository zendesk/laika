import { Observable } from '@apollo/client/core'
import { GraphQLError } from 'graphql'
import cloneDeep from 'lodash/cloneDeep'
import { getOperationType } from './hasOperation'
import { getMatcherFn } from './linkUtils'
import type {
  ChaosTransportSimulationOptions,
  FetchResult,
  Matcher,
  NextLink,
  Operation,
  TargetedTransportRule,
  TransportDecision,
  TransportFailure,
  TransportOperation,
  TransportSimulationOptions,
  TransportSnapshot,
} from './typedefs'

const MAX_DECISION_ENTRIES = 100

const delay = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs)
  })

type Effect = {
  latencyMs: number
  chaosSkipped: boolean
  failure?: TransportFailure
}

/** @internal
 * Implementation behind {@link Laika.transport}. It deliberately has no
 * ApolloLink of its own: Laika owns the link placement and lifecycle.
 */
export class TransportSimulationState {
  private configuration: TransportSimulationOptions | undefined

  private readonly operations = new Map<string, TransportOperation>()

  private decisions: TransportDecision[] = []

  private nextDecisionId = 1

  private readonly listeners = new Set<() => void>()

  set(configuration: TransportSimulationOptions | undefined): void {
    if (configuration !== undefined) validateConfiguration(configuration)
    this.configuration =
      configuration === undefined
        ? undefined
        : cloneConfiguration(configuration)
    this.notify()
  }

  snapshot(): TransportSnapshot {
    return {
      configuration:
        this.configuration === undefined
          ? undefined
          : cloneConfiguration(this.configuration),
      operations: [...this.operations.values()].map(cloneOperation),
      decisions: this.decisions.map(cloneDecision),
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  observe(operation: Operation): void {
    const observed = toTransportOperation(operation)
    const key = JSON.stringify(observed)
    if (this.operations.has(key)) return

    this.operations.set(key, observed)
    this.notify()
  }

  forward(operation: Operation, downstream: NextLink): Observable<FetchResult> {
    const configuration = this.configuration
    if (configuration === undefined) return downstream(operation)

    const observed = toTransportOperation(operation)
    const effect = decideEffect(configuration, operation, observed)
    this.recordDecision({
      timestamp: Date.now(),
      mode: configuration.mode,
      operation: observed,
      latencyMs: effect.latencyMs,
      chaosSkipped: effect.chaosSkipped,
      injectedFailure: effect.failure,
    })

    return new Observable<FetchResult>((observer) => {
      let active = true
      let downstreamSubscription: { unsubscribe: () => void } | undefined

      const run = async () => {
        if (effect.latencyMs > 0) {
          await delay(effect.latencyMs)
          if (!active) return
        }

        if (effect.failure?.kind === 'network') {
          observer.error?.(
            new Error(
              effect.failure.message ??
                `Laika transport simulation: network failure for ${formatOperationName(operation)}`,
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
                  `Laika transport simulation: GraphQL failure for ${formatOperationName(operation)}`,
              ),
            ],
          })
          observer.complete?.()
          return
        }

        downstreamSubscription = downstream(operation).subscribe({
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
        downstreamSubscription?.unsubscribe()
      }
    })
  }

  private recordDecision(entry: Omit<TransportDecision, 'id'>): void {
    this.decisions = [
      ...this.decisions,
      cloneDecision({ ...entry, id: this.nextDecisionId++ }),
    ].slice(-MAX_DECISION_ENTRIES)
    this.notify()
  }

  private notify(): void {
    // Consumer-owned diagnostics must never affect an Apollo operation.
    this.listeners.forEach((listener) => {
      try {
        listener()
      } catch {
        // Ignore a broken DevTools panel.
      }
    })
  }
}

function decideEffect(
  configuration: TransportSimulationOptions,
  operation: Operation,
  observed: TransportOperation,
): Effect {
  if (configuration.mode === 'targeted') {
    const rule = configuration.rules.find((candidate) =>
      getMatcherFn(candidate.matcher)(operation),
    )
    return effectForTargetedRule(rule)
  }

  return effectForChaos(configuration, operation, observed)
}

function effectForTargetedRule(
  rule: TargetedTransportRule | undefined,
): Effect {
  return {
    latencyMs: rule?.latencyMs ?? 0,
    chaosSkipped: false,
    failure: rule?.failure,
  }
}

function effectForChaos(
  configuration: ChaosTransportSimulationOptions,
  operation: Operation,
  observed: TransportOperation,
): Effect {
  if (
    configuration.matcher !== undefined &&
    !getMatcherFn(configuration.matcher)(operation)
  ) {
    return { latencyMs: 0, chaosSkipped: false }
  }

  const chaosSkipped =
    observed.operationType === 'subscription' &&
    configuration.includeSubscriptions !== true
  if (chaosSkipped) return { latencyMs: 0, chaosSkipped }

  const latencyMs = randomLatency(
    configuration.latency.minMs,
    configuration.latency.maxMs,
  )
  const failure: TransportFailure | undefined =
    randomUnit() * 100 >= configuration.errorProbability
      ? undefined
      : { kind: randomUnit() < 0.5 ? 'network' : 'graphql' }

  return { latencyMs, chaosSkipped, failure }
}

function randomLatency(minMs: number, maxMs: number): number {
  const range = maxMs - minMs
  return Number.isInteger(minMs) && Number.isInteger(maxMs)
    ? minMs + Math.floor(randomUnit() * (range + 1))
    : minMs + randomUnit() * range
}

function randomUnit(): number {
  const value = Math.random()
  if (!Number.isFinite(value)) return 0
  return Math.min(1 - Number.EPSILON, Math.max(0, value))
}

function formatOperationName(operation: Operation): string {
  return operation.operationName || '(anonymous operation)'
}

function toTransportOperation(operation: Operation): TransportOperation {
  const context = operation.getContext()
  return {
    operationName: operation.operationName || undefined,
    operationType: getOperationType(operation),
    clientName:
      context.clientName === undefined ? undefined : String(context.clientName),
    feature:
      context.feature === undefined ? undefined : String(context.feature),
  }
}

function validateConfiguration(
  configuration: TransportSimulationOptions,
): void {
  if (configuration === null || typeof configuration !== 'object') {
    throw new Error(
      "Transport simulation configuration.mode must be 'targeted' or 'chaos'",
    )
  }

  if (configuration.mode === 'targeted') {
    if (!Array.isArray(configuration.rules)) {
      throw new Error(
        'Transport simulation configuration.rules must be an array',
      )
    }
    configuration.rules.forEach((rule, index) =>
      validateTargetedRule(rule, `configuration.rules[${index}]`),
    )
    return
  }

  if (configuration.mode !== 'chaos') {
    throw new Error(
      "Transport simulation configuration.mode must be 'targeted' or 'chaos'",
    )
  }

  validateMatcher(configuration.matcher, 'configuration.matcher', true)
  validateNonNegativeFinite(
    configuration.latency?.minMs,
    'configuration.latency.minMs',
  )
  validateNonNegativeFinite(
    configuration.latency?.maxMs,
    'configuration.latency.maxMs',
  )
  if (configuration.latency.minMs > configuration.latency.maxMs) {
    throw new Error(
      'Transport simulation configuration.latency.minMs must be less than or equal to configuration.latency.maxMs',
    )
  }
  if (
    !Number.isFinite(configuration.errorProbability) ||
    configuration.errorProbability < 0 ||
    configuration.errorProbability > 100
  ) {
    throw new Error(
      'Transport simulation configuration.errorProbability must be between 0 and 100',
    )
  }
  if (
    configuration.includeSubscriptions !== undefined &&
    typeof configuration.includeSubscriptions !== 'boolean'
  ) {
    throw new Error(
      'Transport simulation configuration.includeSubscriptions must be a boolean when provided',
    )
  }
}

function validateTargetedRule(
  rule: TargetedTransportRule,
  label: string,
): void {
  if (rule === null || typeof rule !== 'object') {
    throw new Error(`Transport simulation ${label} must be an object`)
  }
  validateMatcher(rule.matcher, `${label}.matcher`, false)
  if (rule.latencyMs !== undefined) {
    validateNonNegativeFinite(rule.latencyMs, `${label}.latencyMs`)
  }
  if (rule.failure !== undefined) {
    validateFailure(rule.failure, `${label}.failure`)
  }
  if (rule.latencyMs === undefined && rule.failure === undefined) {
    throw new Error(
      `Transport simulation ${label} must provide latencyMs or failure`,
    )
  }
}

function validateMatcher(
  matcher: Matcher | undefined,
  label: string,
  optional: boolean,
): void {
  if (matcher === undefined && optional) return
  if (
    matcher === undefined ||
    (typeof matcher !== 'function' &&
      (matcher === null || typeof matcher !== 'object'))
  ) {
    throw new Error(`Transport simulation ${label} must be a matcher`)
  }
}

function validateFailure(failure: TransportFailure, label: string): void {
  if (failure === null || typeof failure !== 'object') {
    throw new Error(`Transport simulation ${label} must be an object`)
  }
  if (failure.kind !== 'network' && failure.kind !== 'graphql') {
    throw new Error(
      `Transport simulation ${label}.kind must be 'network' or 'graphql'`,
    )
  }
  if (failure.message !== undefined && typeof failure.message !== 'string') {
    throw new Error(
      `Transport simulation ${label}.message must be a string when provided`,
    )
  }
}

function validateNonNegativeFinite(value: unknown, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Transport simulation ${label} must be a finite number greater than or equal to 0`,
    )
  }
}

function cloneConfiguration(
  configuration: TransportSimulationOptions,
): TransportSimulationOptions {
  if (configuration.mode === 'targeted') {
    return {
      mode: 'targeted',
      rules: configuration.rules.map((rule) => ({
        matcher: cloneMatcher(rule.matcher),
        latencyMs: rule.latencyMs,
        failure:
          rule.failure === undefined
            ? undefined
            : { kind: rule.failure.kind, message: rule.failure.message },
      })),
    }
  }

  return {
    mode: 'chaos',
    matcher:
      configuration.matcher === undefined
        ? undefined
        : cloneMatcher(configuration.matcher),
    latency: {
      minMs: configuration.latency.minMs,
      maxMs: configuration.latency.maxMs,
    },
    errorProbability: configuration.errorProbability,
    includeSubscriptions: configuration.includeSubscriptions,
  }
}

function cloneMatcher(matcher: Matcher): Matcher {
  if (typeof matcher === 'function') return matcher
  return {
    ...matcher,
    variables:
      matcher.variables === undefined
        ? undefined
        : cloneDeep(matcher.variables),
  }
}

function cloneOperation(operation: TransportOperation): TransportOperation {
  return { ...operation }
}

function cloneDecision(decision: TransportDecision): TransportDecision {
  return {
    ...decision,
    operation: cloneOperation(decision.operation),
    injectedFailure:
      decision.injectedFailure === undefined
        ? undefined
        : {
            kind: decision.injectedFailure.kind,
            message: decision.injectedFailure.message,
          },
  }
}
