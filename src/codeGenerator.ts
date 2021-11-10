/* eslint-disable @typescript-eslint/no-shadow,@typescript-eslint/triple-slash-reference */

/// <reference types="typescript/lib/lib.es2021" />

import camelCase from 'lodash/camelCase'
import flatten from 'lodash/flatten'
import groupBy from 'lodash/groupBy'
import sortBy from 'lodash/sortBy'
import uniq from 'lodash/uniq'
import {
  forEachDeep,
  indexOfWord,
  startsWithNumber,
} from './codeGeneratorUtils'
import type {
  ArgsType,
  EventFilterFn,
  RecordingElement,
  RecordingElementWithFixtureData,
  RecordingElementWithFixtureMeta,
  RecordingPoint,
  RecordingPointWithFixtureData,
  Replacements,
} from './typedefs'

export type GenerateCodeArgs = ArgsType<typeof generateCode>
export type GenerateCodeOptions = GenerateCodeArgs[2]

const MAX_VALUE_LENGTH = 100
const MAX_PHRASE_TO_VALUE_LENGTH_RATIO = 0.3
const MAX_REFERENCED_VALUE_LENGTH = 5
const ONE_SECOND_MS = 1000

// note: This file needs a little work to make it more readable.
// Because it's not the mission critical part of the package,
// least time was devoted to it.
// Please help to improve it!
export const generateCode = (
  {
    recording: inputRecording,
    referenceName,
  }: { recording: RecordingElement[]; referenceName: string },
  eventFilter: EventFilterFn = () => true,
  {
    /** Keys that will never be replaced with variables. By default only `['__typename']`. */
    nonVariableKeys = ['__typename'],
    substringVariables = true,
    minRepeatCount = 1,
    notExtractablePartialPhrases = [
      'System',
      'Type',
      'Status',
      'ticket',
      'subject',
      'status',
    ],
    deprioritizedKeys = ['value', 'title', 'values'],
    skipDeduplicationValues = ['-1', '0'],
    skipDeduplicationKey = ['at'],
    skipPathNames = ['node', 'edges', 'pageInfoTotal'],
  } = {},
) => {
  const recording = inputRecording.filter(eventFilter)

  const phrasesList: Map<
    string,
    { key: string; value: unknown; event: RecordingPoint }[]
  > = new Map()

  const getTraverser =
    (event: RecordingPoint, skipPathRootsCount: number | undefined = 0) =>
    ({
      path,
      value,
      key,
    }: {
      path: string[]
      value: unknown
      key?: string
    }) => {
      if (!key || nonVariableKeys.includes(key)) return undefined

      // unfortunately some backends represent the same IDs as strings, while others as numbers
      const valueAsString = String(value)
      if (valueAsString.length === 0) return value

      const names: {
        key: string
        value: unknown
        event: RecordingPoint
      }[] = phrasesList.get(valueAsString) ?? []
      if (
        names.every(
          ({ event: ev }) =>
            ev.clientName !== event.clientName ||
            ev.operationName !== event.operationName,
        )
      ) {
        const relevantPath = path
          .slice(skipPathRootsCount)
          .filter((name) => !skipPathNames.includes(name))

        // TODO: add __typename for better variable names

        names.push({
          key: relevantPath.join('.'),
          value,
          event,
        })
        phrasesList.set(valueAsString, names)
      }
      return undefined
    }

  recording.forEach((event) => {
    if (event.type === 'marker') return

    // deeply traverse these variables:
    forEachDeep({ value: event.variables }, getTraverser(event))
    // deeply traverse this result:
    forEachDeep({ value: event.result }, getTraverser(event, 2))
  })

  const existingFixtureNames: Set<string> = new Set()

  const existingStringifiedFixturesToNames = new Map<string, string>()

  // sort this map from longest value to shortest to get most accurate results
  const phrases = new Map<string, { key: string; value: unknown }[]>(
    sortBy([...phrasesList], [([value]) => -value.length]),
  )

  const allValueAsStringToVariableName: [string, string][] = []

  const allReplacedVariables: [string, { key: string; value: unknown }[]][] = []

  // second time we iterate we'll have collected data from all recorded events (and thus repetitions)
  const recordingWithFixtureMeta: RecordingElementWithFixtureMeta[] =
    recording.map((event) => {
      if (event.type === 'marker') return event

      const replacedVariables = new Map<
        string,
        { key: string; value: unknown }[]
      >()

      const variableValues = new Map<
        string,
        {
          replacement: string
          placeholder: string
          originalValue: boolean | number | string
          partial?: boolean
          valueAsString: string
          variableName: string
          skipDeduplication: boolean
        }[]
      >()
      let duplicateSuffix = 1
      // TODO: use lodash recursive mapValues first, flattened by path, unflatten and JSON.stringify ready-to-use object
      let stringifiedResult = JSON.stringify(
        event.result,
        (key, value) => {
          if (
            !key ||
            nonVariableKeys.includes(key) ||
            (typeof value !== 'string' &&
              typeof value !== 'number' &&
              typeof value !== 'boolean')
          ) {
            return value as unknown
          }

          const valueAsString = String(value)
          if (valueAsString.length === 0) return value

          const skipDeduplication =
            typeof value === 'boolean' ||
            skipDeduplicationValues.includes(valueAsString) ||
            skipDeduplicationKey.includes(key)

          /**
           * @param {{phrase?: string, value: string | number | boolean, names: Array<{key: string, value: string | number | boolean}>, skipDeduplication?: boolean}} config
           */
          const createVariable = ({
            names,
            phrase,
            value,
            skipDeduplication = false,
          }: {
            phrase?: string
            value: boolean | number | string
            names: { key: string; value: unknown }[]
            skipDeduplication?: boolean
          }): string => {
            const valueAsString = String(value)
            // let's take the longest (or best) name from all duplicates (probably most descriptive)
            // TODO: the fallback to 'key' should be the full path, not just the leaf name - but we don't have that during JSON.stringify :( otherwise those keys that skip deduplication don't have consistent naming
            const [{ key: name = key } = {}] = sortBy(names, [
              ({ key: thisKey }) => {
                const parts = thisKey.split('.')
                return deprioritizedKeys.some((deprioKey) =>
                  parts.includes(deprioKey),
                )
                  ? Number.POSITIVE_INFINITY
                  : // lower priority to keys with numbers
                  parts.some((part) => !Number.isNaN(Number(part)))
                  ? thisKey.length
                  : -thisKey.length
              },
            ])
            // if first letter is a number, need to prefix for a valid variable name:
            const variableNameBase = `${
              startsWithNumber(name) ? '_' : ''
            }${camelCase(name)}`
            let variableName = variableNameBase
            let suffixNumber = 2
            while (
              replacedVariables.has(variableName) &&
              (skipDeduplication ||
                replacedVariables.get(variableName)?.[0].value !== value)
            ) {
              variableName = `${variableNameBase}${suffixNumber++}`
            }
            replacedVariables.set(variableName, names)

            const placeholder = `______${
              phrase ? 'PARTIAL' : 'VARIABLE'
            }_${variableName}_${duplicateSuffix++}______`

            const replacements = variableValues.get(valueAsString) ?? []

            replacements.push({
              partial: Boolean(phrase),
              placeholder,
              replacement: phrase
                ? `\${${variableName}}`
                : typeof value === 'number'
                ? `Number(${variableName})`
                : typeof value === 'boolean'
                ? variableName
                : `\`\${${variableName}}\``,
              variableName,
              skipDeduplication,
              originalValue: value,
              valueAsString: phrase ?? valueAsString,
            })

            variableValues.set(valueAsString, replacements)

            return phrase
              ? valueAsString.replaceAll(phrase, placeholder)
              : placeholder
          }

          const names: {
            key: string
            value: unknown
          }[] = skipDeduplication
            ? [{ key, value }]
            : phrases.get(valueAsString) ?? []
          if (
            (valueAsString.length < MAX_VALUE_LENGTH &&
              names.length >= minRepeatCount) ||
            skipDeduplication
          ) {
            return createVariable({ names, value, skipDeduplication })
          }
          if (!substringVariables) {
            return value
          }
          let resultValue = value
          for (const [phrase, names] of phrases) {
            if (
              !notExtractablePartialPhrases.includes(phrase) &&
              names.length >= minRepeatCount &&
              typeof value === 'string' &&
              value.includes(phrase) &&
              phrase.length / value.length > MAX_PHRASE_TO_VALUE_LENGTH_RATIO
            ) {
              resultValue = createVariable({
                phrase,
                names,
                value: resultValue,
                skipDeduplication,
              })
            }
          }
          return resultValue
        },
        2,
      )

      for (const replacements of variableValues.values()) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        replacements.forEach(({ partial, placeholder, replacement }, index) => {
          if (partial) {
            const wrappingToken = replacements.length - 1 === index ? '`' : '"'
            const jsonStringRegExp = new RegExp(
              `: (?<!\\\\)".*?${placeholder}.*?(?<!\\\\)"`,
              'g',
            )
            stringifiedResult = stringifiedResult.replace(
              jsonStringRegExp,
              (match) =>
                `${match.slice(0, 2)}${wrappingToken}${match
                  // cut out the `: "` from beginning and `"` from end:
                  .slice(3, -1)
                  .replaceAll(placeholder, replacement)}${wrappingToken}`,
            )
          } else {
            stringifiedResult = stringifiedResult.replaceAll(
              `"${placeholder}"`,
              replacement,
            )
          }
        })
      }

      const valueAsStringToVariableNameArr: [string, string][] = sortBy(
        flatten([...variableValues.values()])
          .filter(({ skipDeduplication }) => !skipDeduplication)
          .map(({ valueAsString, variableName }) => [
            valueAsString,
            variableName,
          ]),
        [([valueAsString]) => -valueAsString.length],
      )
      const valueAsStringToVariableName = new Map(
        valueAsStringToVariableNameArr,
      )
      allValueAsStringToVariableName.push(...valueAsStringToVariableNameArr)
      replacedVariables.forEach((value, key) => {
        allReplacedVariables.push([key, value])
      })

      const { clientName, operationName, feature, action } = event

      let fixtureFnName = camelCase(
        `get ${clientName} ${operationName ?? feature} fixture`,
      )

      const existingFixtureFnName =
        existingStringifiedFixturesToNames.get(stringifiedResult)
      if (existingFixtureFnName) {
        let suffixNumber = 2
        const fixtureFnNameBase = fixtureFnName
        while (existingFixtureNames.has(fixtureFnName)) {
          fixtureFnName = `${fixtureFnNameBase}${suffixNumber++}`
        }
        existingFixtureNames.add(fixtureFnName)
        return {
          ...event,
          fixtureFnName,
          reuseFixture: existingFixtureFnName,
          valueAsStringToVariableName,
          replacedVariables,
          stringifiedResult,
        }
      }
      if (existingFixtureNames.has(fixtureFnName)) {
        fixtureFnName = camelCase(
          `get ${clientName} ${operationName ?? feature} ${action} fixture`,
        )
      }

      let suffixNumber = 2
      const fixtureFnNameBase = fixtureFnName
      while (existingFixtureNames.has(fixtureFnName)) {
        fixtureFnName = `${fixtureFnNameBase}${suffixNumber++}`
      }

      existingFixtureNames.add(fixtureFnName)
      existingStringifiedFixturesToNames.set(stringifiedResult, fixtureFnName)

      return {
        ...event,
        fixtureFnName,
        reuseFixture: undefined,
        valueAsStringToVariableName,
        replacedVariables,
        stringifiedResult,
      }
    })

  const allValueAsStringToVariableNameMap: Map<string, string> = new Map(
    sortBy(allValueAsStringToVariableName, [
      ([valueAsString]) => -valueAsString.length,
    ]),
  )

  const fixtureFnToVariables: Map<string, string> = new Map()

  const recordingWithFixtures: RecordingElementWithFixtureData[] =
    recordingWithFixtureMeta.map((event) => {
      if (event.type === 'marker') return event
      const {
        clientName,
        operationName,
        feature,
        action,
        replacedVariables = new Map<string, Replacements>(),
        fixtureFnName,
        reuseFixture,
        stringifiedResult,
      } = event
      const printedVariables = new Set()

      const printVariable = (
        [variableName, keyValuePairs]: [
          string,
          { key: string; value: unknown }[],
        ],
        style = 'parameter',
      ): string => {
        if (printedVariables.has(variableName)) return ''
        printedVariables.add(variableName)
        const assignmentToken = style === 'parameter' ? ' =' : ':'

        const aka = uniq(keyValuePairs.map(({ key }) => key).filter(Boolean))
        const akaString =
          aka.length > 1 ? `    /** known as: ${aka.join(', ')} */\n` : ''
        const { value } = keyValuePairs[0]
        let stringifiedValue = JSON.stringify(value)
        const needPrintingFirst = []
        const valueIsIdLike = /^[\d_-]+$/.test(String(value))
        if (typeof value === 'string' && !valueIsIdLike) {
          let replacedValue = value

          const replacements: Map<
            { placeholder: string; variableName: string },
            string
          > = new Map()
          let placeholderIndex = 1
          for (const [
            referencedValueAsString,
            referencedVariableName,
          ] of allValueAsStringToVariableNameMap) {
            // skip self:
            if (
              referencedVariableName === variableName ||
              referencedValueAsString.length < MAX_REFERENCED_VALUE_LENGTH
            ) {
              // eslint-disable-next-line no-continue
              continue
            }

            let referencedIndex
            while (
              // eslint-disable-next-line no-cond-assign
              (referencedIndex = indexOfWord(
                replacedValue,
                referencedValueAsString,
              )) >= 0
            ) {
              const placeholder = `_____PLACEHOLDER_${placeholderIndex++}_____`
              replacedValue =
                replacedValue.slice(0, referencedIndex) +
                placeholder +
                replacedValue.slice(
                  referencedIndex + referencedValueAsString.length,
                )
              replacements.set(
                { placeholder, variableName: referencedVariableName },
                `\${${referencedVariableName}}`,
              )
            }
          }
          if (replacements.size > 0) {
            stringifiedValue = JSON.stringify(replacedValue)

            for (const [
              { placeholder, variableName: referencedVariableName },
              replacementString,
            ] of replacements) {
              stringifiedValue = stringifiedValue.replaceAll(
                placeholder,
                replacementString,
              )
              needPrintingFirst.push(referencedVariableName)
            }
            // replace surrounding quotes with backticks:
            stringifiedValue = `\`${stringifiedValue.slice(1, -1)}\``
          }
        }
        return `${needPrintingFirst
          .map((referencedVariableName) =>
            printVariable(
              allReplacedVariables.find(
                ([name]) => referencedVariableName === name,
              )!,
              style,
            ),
          )
          .join(
            '',
          )}${akaString}    ${variableName}${assignmentToken} ${stringifiedValue},\n`
      }

      const variablesAsParameter = [...replacedVariables]
        .map((pair) => printVariable(pair, 'parameter'))
        .join('')

      const initialVariables = reuseFixture
        ? fixtureFnToVariables.get(reuseFixture)
        : undefined

      const variables = reuseFixture
        ? initialVariables === variablesAsParameter
          ? ''
          : [...replacedVariables]
              .map((pair) => printVariable(pair, 'object'))
              .join('')
        : variablesAsParameter

      if (!initialVariables) {
        fixtureFnToVariables.set(fixtureFnName, variablesAsParameter)
      }

      const fixtureJsDoc = `/**
* @description Fixture for operation ${clientName}/${operationName}${
        feature ? ` (${feature})` : ''
      }, captured when ${action}.
*/
`

      let fixtureFnString = ''
      const fixtureCallString = reuseFixture
        ? `${reuseFixture}({${variables === '' ? '' : `\n${variables}`}})`
        : `${fixtureFnName}()`

      if (!reuseFixture) {
        const fixtureFnHeader =
          (replacedVariables?.size ?? 0) === 0
            ? `const ${fixtureFnName} = () => `
            : `const ${fixtureFnName} = (
{
${variables}  } = {},
) => `
        fixtureFnString = `${fixtureJsDoc}${fixtureFnHeader}(${stringifiedResult});`
      }
      const result: RecordingPointWithFixtureData = {
        ...(event as RecordingPoint),
        fixtureFnString,
        fixtureFnName,
        fixtureCallString,
      }
      return result
    })

  const events = recordingWithFixtures.filter(
    (event): event is RecordingPointWithFixtureData => event.type !== 'marker',
  )

  const fixturesString = events
    .map((event) => event.fixtureFnString)
    .filter((text) => Boolean(text))
    .join('\n')

  const grouped = groupBy(events, ({ clientName, operationName, feature }) =>
    camelCase(`${clientName} ${operationName ?? feature} Interceptor`),
  )

  const eventToInterceptorMetaMap: Map<
    RecordingPoint,
    { interceptorVariableName: string; hasMultipleVariations: boolean }
  > = new Map()
  const interceptorsString = Object.entries(grouped)
    .map(([interceptorVariableName, events]) => {
      const variableVariations = Object.keys(
        groupBy(events, ({ variables }) => JSON.stringify(variables)),
      )
      const hasMultipleVariations = variableVariations.length > 1
      events.forEach((event) =>
        eventToInterceptorMetaMap.set(event, {
          interceptorVariableName,
          hasMultipleVariations,
        }),
      )
      const [firstEvent] = events
      return `
const ${interceptorVariableName} = ${referenceName}.intercept({
clientName: ${JSON.stringify(firstEvent.clientName)},
${
  firstEvent.operationName == null
    ? `// this operation is unnamed, please update the part of the code that references these variables: ${Object.keys(
        firstEvent.variables,
      ).join(', ')} `
    : `operationName: ${JSON.stringify(firstEvent.operationName)}`
},${
        firstEvent.feature
          ? `\n  // feature: ${JSON.stringify(firstEvent.feature)},`
          : ''
      }
// (${
        hasMultipleVariations
          ? 'multiple sets of variables captured, matchers added to the individual mock statements'
          : 'single set of variables captured - specifier likely not required'
      })
// variables: ${variableVariations.join('\n  // variables: ')},
});
`
    })
    .join('\n')

  const callsString = recordingWithFixtures
    .map((event) => {
      const timePassed = (event.timeDelta / ONE_SECOND_MS).toFixed(2)
      if (event.type === 'marker') {
        return `\n// action: ${event.action} (${timePassed}s)`
      }
      const { variables, type, fixtureCallString } = event
      const meta = eventToInterceptorMetaMap.get(event)
      if (!meta) return ''

      const { interceptorVariableName, hasMultipleVariations } = meta
      const matcherArgument = `{variables: ${JSON.stringify(variables)}}`
      return type === 'push'
        ? `
// subscription update after ${timePassed}s
${interceptorVariableName}.fireSubscriptionUpdate(${fixtureCallString}${
            hasMultipleVariations
              ? `, ${matcherArgument});`
              : `); // ${matcherArgument}`
          }
`
        : `
// backend response after ${timePassed}s
${interceptorVariableName}.mockResultOnce(${fixtureCallString}${
            hasMultipleVariations
              ? `, ${matcherArgument});`
              : `); // ${matcherArgument}`
          }
`
    })
    .join('\n')

  return `
/** FIXTURES **/
${fixturesString}

/** INTERCEPTOR DECLARATIONS **/
${interceptorsString}

/** MOCK SETUP AND PUSH IN ORDER OF EVENTS **/
${callsString}
`
}
