import forEach from 'lodash/forEach'
import isObject from 'lodash/isObject'

/**
 * Like String.indexOf but only matches when surrounded by word boundary
 */
export const indexOfWord = (
  input: string,
  searchedWord: string,
  _preceedingChar = ' ',
  _index = 0,
): number => {
  const referencedIndex = input.indexOf(searchedWord)
  if (referencedIndex < 0) return referencedIndex

  // poor man's RegExp word boundary (we don't wanna do regexp for such large strings)
  const preceedingChar =
    referencedIndex > 0
      ? input[referencedIndex - 1]!
      : referencedIndex === 0
      ? _preceedingChar
      : ' '
  const matchEndIndex = referencedIndex + searchedWord.length
  const followingChar =
    matchEndIndex < input.length ? input[matchEndIndex] : ' '
  const nonWordChar = /\W/
  if (
    nonWordChar.test(preceedingChar) &&
    typeof followingChar === 'string' &&
    nonWordChar.test(followingChar)
  ) {
    return referencedIndex + _index
  }
  // recursive tail-call loop by cutting out the front of the input string every time
  // until the indexOf results in -1
  return indexOfWord(
    input.slice(matchEndIndex),
    searchedWord,
    input[matchEndIndex - 1],
    matchEndIndex,
  )
}

export const forEachDeep = (
  { path = [], value, key }: { path?: string[]; key?: string; value: unknown },
  callback: (result: { path: string[]; value: unknown; key?: string }) => void,
): void =>
  isObject(value)
    ? void forEach(
        value,
        // eslint-disable-next-line @typescript-eslint/no-shadow
        (childValue, key) =>
          void forEachDeep(
            { path: [...path, key], key, value: childValue },
            callback,
          ),
      )
    : void callback({ path, value, key })

export const startsWithNumber = (str: string) =>
  !Number.isNaN(Number.parseInt(str?.[0] ?? '', 10))
