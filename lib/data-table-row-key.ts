export function getDataTableRowKey<T extends object>(
  item: T,
  idKey: keyof T | string,
  index: number,
): string {
  const value = item[String(idKey) as keyof T]
  return value === undefined || value === null || String(value).trim() === ""
    ? `row:${index}`
    : `${String(value)}:${index}`
}
