// Single-process protection only. Sheets has no cross-instance unique constraint.
// Authorization is checked by the task after it acquires its turn, never before waiting.
let tail: Promise<void> = Promise.resolve()
export function withEntenteWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const result = tail.then(task)
  tail = result.then(() => undefined, () => undefined)
  return result
}
