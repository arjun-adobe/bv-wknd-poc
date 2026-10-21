/*
 * adventure
 * The block a published Adventure structured content entry carries (the block
 * name is the schema name). It renders the entry at its own URL from the entry's
 * JSON; the raw field rows in the document are replaced. Rendering lives in
 * scripts/adventure-render.js; scripts.js drops the entry's storage blocks first.
 */
import renderAdventure from '../../scripts/adventure-render.js';

export default async function decorate(block) {
  // local dev serves content under /content/
  const path = window.location.pathname.replace(/^\/content(?=\/)/, '');
  await renderAdventure(block, path);
}
