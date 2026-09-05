export function excludeCalled<T extends { id: string }>(items: T[], calledGirlIds: string[] | undefined): T[] {
  if (!calledGirlIds?.length) return items;
  const called = new Set(calledGirlIds);
  return items.filter((item) => !called.has(item.id));
}

export function isCalledGirl(girlId: string, calledGirlIds: string[] | undefined) {
  return Boolean(calledGirlIds?.includes(girlId));
}
