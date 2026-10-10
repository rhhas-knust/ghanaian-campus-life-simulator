/**
 * Tiny DOM helpers.
 *
 * The UI is hand-written HTML in `index.html` rather than generated at runtime,
 * so these lookups are the seam between the markup and the game. Failing loudly
 * on a missing element turns a typo in the HTML into an immediate, readable
 * error instead of a silent null-reference crash three frames later.
 */

export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`UI element #${id} is missing from index.html`);
  }
  return element as T;
}

export function setHidden(element: HTMLElement, hidden: boolean): void {
  element.hidden = hidden;
}

/** Replaces an element's children with paragraphs and an optional bullet list. */
export function renderTextBlock(
  container: HTMLElement,
  paragraphs: readonly string[],
  bullets?: readonly string[],
): void {
  container.replaceChildren();

  for (const paragraph of paragraphs) {
    const element = document.createElement('p');
    // `textContent`, never `innerHTML`: the data files are ours today, but this
    // content is exactly the kind of thing a CMS or a translator touches later.
    element.textContent = paragraph;
    container.append(element);
  }

  if (bullets && bullets.length > 0) {
    const list = document.createElement('ul');
    for (const bullet of bullets) {
      const item = document.createElement('li');
      item.textContent = bullet;
      list.append(item);
    }
    container.append(list);
  }
}

/** Fills a `<dl>`-style grid with keyboard/touch control hints. */
export function renderControlsList(
  container: HTMLElement,
  entries: readonly { readonly keys: string; readonly action: string }[],
): void {
  container.replaceChildren();
  for (const entry of entries) {
    const term = document.createElement('dt');
    term.textContent = entry.keys;
    const description = document.createElement('dd');
    description.textContent = entry.action;
    container.append(term, description);
  }
}
