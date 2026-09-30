export const chunk = <T>(items: Array<T>, size: number): Array<Array<T>> =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )
