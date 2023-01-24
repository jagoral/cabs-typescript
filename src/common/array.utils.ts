export function isInArray<T extends { getId(): string }>(
  array: T[],
  element: T,
): boolean {
  return array
    .map((singleItem) => singleItem.getId())
    .includes(element.getId());
}
