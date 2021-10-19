export const getLogStyle = (input: unknown) => {
  const str = typeof input === 'string' ? input : '(anonymous)'
  const hash = [...str].reduce(
    (sum, letter) => sum + (letter.codePointAt(0) ?? 0),
    0,
  )
  const hue = hash.toFixed(0)
  return `color: hsl(${hue}, 70%, 70%); background-color: black`
}
