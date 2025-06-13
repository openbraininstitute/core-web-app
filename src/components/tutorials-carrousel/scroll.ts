export function scrollCardIntoView(container: HTMLDivElement, cardIndex: number) {
  const node = container.querySelectorAll('a').item(cardIndex);
  if (node) {
    node.scrollIntoView({
      behavior: 'smooth',
    });
  }
}
