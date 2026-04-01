import { Observable } from '@apollo/client/core'

export const mapObservable = <Input, Output>(
  input: Observable<Input>,
  mapFn: (value: Input) => Output,
) =>
  new Observable<Output>((observer) =>
    input.subscribe({
      next: (value) => {
        observer.next?.(mapFn(value))
      },
      error: (error) => {
        observer.error?.(error)
      },
      complete: () => {
        observer.complete?.()
      },
    }),
  )
