// Both blocks share references. Serialize local commands before fresh validation.
let tail: Promise<unknown> = Promise.resolve()
export function affiliationLicenceWriteTurn<T>(work: () => Promise<T>) {
 const next = tail.catch(() => {}).then(work)
 tail = next
 return next
}
