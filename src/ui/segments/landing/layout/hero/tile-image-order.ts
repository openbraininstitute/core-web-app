/** Shuffle the three image layers, avoiding the previous page's opening image. */
export function randomTileImageOrder(previousFirst?: number, random = Math.random): number[] {
  const order = [0, 1, 2];
  for (let i = order.length - 1; i > 0; i--) {
    const other = Math.floor(random() * (i + 1));
    [order[i], order[other]] = [order[other], order[i]];
  }
  if (order[0] === previousFirst) order.push(order.shift() as number);
  return order;
}
