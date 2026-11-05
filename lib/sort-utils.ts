const frenchCollator = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
})

export function compareLabels(left: string, right: string): number {
  return frenchCollator.compare(left.trim(), right.trim())
}
