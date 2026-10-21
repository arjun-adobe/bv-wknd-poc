/*
 * adventure-detail
 * Renders an adventure page from an Adventure structured content entry stored
 * elsewhere. The authored block holds one cell: a link (or path) to the entry,
 * e.g. /adventures-data/bali-surf-camp. Rendering lives in scripts/adventure-render.js.
 */
import renderAdventure from '../../scripts/adventure-render.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const ref = link ? new URL(link.href, window.location.href).pathname : block.textContent.trim();
  await renderAdventure(block, ref);
}
