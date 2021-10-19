import { indexOfWord } from './codeGeneratorUtils'

describe('indexOfWord', () => {
  it('returns correct value', () => {
    expect(indexOfWord('aa bb cc dd ee ff', 'dd')).toBe(9)
  })
  it('returns correct value when multiple valid results is present', () => {
    expect(indexOfWord('aa bb cc dd ee ff dd', 'dd')).toBe(9)
  })
  it('returns correct value when non-matching value is present, touching end of string', () => {
    expect(indexOfWord('aa bb cc ddd ee ff dd', 'dd')).toBe(19)
  })
  it('returns correct value when match is at the beginning of the string', () => {
    expect(indexOfWord('aa bb cc ddd ee ff', 'aa')).toBe(0)
  })
  it('returns -1 when no match is found', () => {
    expect(indexOfWord('aaa', 'aa')).toBe(-1)
    expect(indexOfWord('aaaa', 'aa')).toBe(-1)
    expect(indexOfWord('aaaa aaaa', 'aa')).toBe(-1)
    expect(indexOfWord('nothing', 'aa')).toBe(-1)
  })
})
