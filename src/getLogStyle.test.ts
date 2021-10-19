import { getLogStyle } from './getLogStyle'

describe('getLogStyle', () => {
  it('returns the correct styling', () => {
    expect(getLogStyle('hello')).toBe(
      'color: hsl(532, 70%, 70%); background-color: black',
    )
  })
})
