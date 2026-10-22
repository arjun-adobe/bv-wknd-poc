/*
 * Shared helpers for blocks that render a structured content entry at its own URL
 * (the block named after the entry's schema, e.g. adventure, event).
 *
 * renderEntry() fetches the entry's JSON from the structured content delivery
 * endpoint and swaps the block's section for the sections a schema-specific
 * builder returns, so existing block code and section layout CSS apply unchanged.
 */
import {
  createOptimizedPicture,
  decorateBlocks,
  decorateSections,
  loadSection,
} from './aem.js';

const SC_ENDPOINT = 'https://da-sc.adobeaem.workers.dev';
const DEFAULT_ORG = 'arjun-adobe';
const DEFAULT_SITE = 'bv-wknd-poc';

/**
 * Resolve the structured content JSON URL for an entry path. org/site come from
 * the {ref}--{site}--{org}.aem.(page|live) host; published (live) data is used
 * on .aem.live, preview data everywhere else (aem.page, localhost).
 * @param {string} path entry path, e.g. /us/en/adventures/bali-surf-camp
 * @returns {string} JSON endpoint URL
 */
export function entryUrl(path) {
  const { hostname } = window.location;
  const [, site = DEFAULT_SITE, org = DEFAULT_ORG] = hostname.match(/^[^.]+--([^.]+)--([^.]+)\.aem\.(?:page|live)$/) || [];
  const env = hostname.endsWith('.aem.live') ? 'live' : 'preview';
  return `${SC_ENDPOINT}/${env}/${org}/${site}${path.replace(/\.html$/, '')}`;
}

/** The current page's path, without the /content prefix local dev serves content under. */
export function pagePath() {
  return window.location.pathname.replace(/^\/content(?=\/)/, '');
}

export function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function picture(image, eager = false) {
  if (!image?.url) return null;
  return createOptimizedPicture(image.url, image.alt || '', eager);
}

/**
 * Fetch an entry and replace the block's section with the sections built from its data.
 * @param {Element} block the block being decorated
 * @param {string} path entry path
 * @param {Function} buildSections (data) => undecorated section divs
 * @param {string} unavailable message shown if the entry can't be loaded
 */
export async function renderEntry(block, path, buildSections, unavailable) {
  const section = block.closest('.section');

  let data;
  try {
    const resp = await fetch(entryUrl(path));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    ({ data } = await resp.json());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`structured content: could not load ${path}`, error);
  }
  if (!data?.title) {
    block.textContent = unavailable;
    return;
  }

  // decorate in a detached container so only the new sections are touched,
  // then swap them in for this block's section and load their blocks
  const container = el('div');
  container.append(...buildSections(data));
  decorateSections(container);
  decorateBlocks(container);
  const sections = [...container.children];
  if (section) section.replaceWith(...sections);
  else block.replaceWith(...sections);
  for (let i = 0; i < sections.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await loadSection(sections[i]);
  }
}
