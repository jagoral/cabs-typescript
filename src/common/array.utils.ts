export function isInArray<T extends { getId(): string }>(
  array: T[],
  element: T,
): boolean {
  return (
    array.some((singleItem) => singleItem === element) ||
    array.map((singleItem) => singleItem.getId()).includes(element.getId())
  );
}
