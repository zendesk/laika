/* eslint-disable no-promise-executor-return */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onNextTick = <Output, T extends (...args: any) => Output>(
  action: T,
) =>
  new Promise<Output>((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(action())
      } catch (error: unknown) {
        reject(error)
      }
    }),
  )

export type WaitForResult<T> = {
  values?: T[]
  error?: unknown
}[]
