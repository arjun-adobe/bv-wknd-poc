/*
 * Adventure rendering for the adventure block (an entry rendered at its own URL).
 *
 * Fetches an Adventure structured content entry as JSON and turns it into the
 * same sections and blocks an authored adventure page has
 * (breadcrumbs | carousel | h1 + adventure-meta + tabs), so the existing block
 * code and section layout CSS apply unchanged.
 */
import {
  buildBlock,
  createOptimizedPicture,
  decorateBlocks,
  decorateSections,
  loadSection,
} from './aem.js';

const SC_ENDPOINT = 'https://da-sc.adobeaem.workers.dev';
const DEFAULT_ORG = 'arjun-adobe';
const DEFAULT_SITE = 'bv-wknd-poc';
const ADVENTURES_PATH = '/us/en/adventures';

const META_ROWS = [
  ['Activity', 'activity'],
  ['Adventure Type', 'adventureType'],
  ['Trip Length', 'tripLength'],
  ['Group Size', 'groupSize'],
  ['Difficulty', 'difficulty'],
  ['Price', 'price'],
];
const TABS = [
  ['Overview', 'overview'],
  ['Itinerary', 'itinerary'],
  ['What to Bring', 'whatToBring'],
];

/**
 * Resolve the structured content JSON URL for an entry path. org/site come from
 * the {ref}--{site}--{org}.aem.(page|live) host; published (live) data is used
 * on .aem.live, preview data everywhere else (aem.page, localhost).
 * @param {string} path entry path, e.g. /us/en/adventures/bali-surf-camp
 * @returns {string} JSON endpoint URL
 */
function entryUrl(path) {
  const { hostname } = window.location;
  const [, site = DEFAULT_SITE, org = DEFAULT_ORG] = hostname.match(/^[^.]+--([^.]+)--([^.]+)\.aem\.(?:page|live)$/) || [];
  const env = hostname.endsWith('.aem.live') ? 'live' : 'preview';
  return `${SC_ENDPOINT}/${env}/${org}/${site}${path.replace(/\.html$/, '')}`;
}

function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function picture(image, eager = false) {
  if (!image?.url) return null;
  return createOptimizedPicture(image.url, image.alt || '', eager);
}

// keep the authored-page price format (5000.0, 152.59)
const formatPrice = (price) => (Number.isInteger(price) ? price.toFixed(1) : String(price));

/**
 * Render one tab's sections: heading, photo (above/below), paragraphs, list.
 * @param {Array} sections Section items from the entry
 * @returns {HTMLElement} tab panel content
 */
function renderSections(sections = []) {
  const body = el('div');
  sections.forEach((section) => {
    const parts = [];
    if (section.heading) parts.push(el('h3', section.heading));
    // paragraphs is a list because line breaks inside one field don't survive
    // publishing; a legacy single `text` field is still split on blank lines
    const paragraphs = section.paragraphs || (section.text || '').split(/\n\s*\n/);
    paragraphs.map((t) => t.trim()).filter(Boolean).forEach((t) => parts.push(el('p', t)));
    const pic = picture(section.image);
    if (pic) {
      const p = el('p');
      p.append(pic);
      const at = section.imagePosition === 'Below text' ? parts.length : Number(!!section.heading);
      parts.splice(at, 0, p);
    }
    if (section.list?.length) {
      const ul = el('ul');
      section.list.forEach((item) => ul.append(el('li', item)));
      parts.push(ul);
    }
    body.append(...parts);
  });
  return body;
}

/**
 * Build the undecorated section divs an authored adventure page would have.
 * @param {Object} data entry data
 * @returns {HTMLElement[]} section divs
 */
function buildSections(data) {
  const crumbsLink = el('a', 'Adventures');
  crumbsLink.href = ADVENTURES_PATH;
  const crumbs = el('div');
  crumbs.append(buildBlock('breadcrumbs', [[crumbsLink], [data.title]]));

  const hero = el('div');
  hero.append(buildBlock('carousel', (data.photos || [])
    .map((photo, i) => [{ elems: [picture(photo, i === 0)] }, ''])));

  const meta = META_ROWS
    .filter(([, key]) => data[key] !== undefined)
    .map(([label, key]) => [label, key === 'price' ? formatPrice(data[key]) : String(data[key])]);
  const tabs = TABS
    .filter(([, key]) => data[key]?.length)
    .map(([label, key]) => [label, { elems: [...renderSections(data[key]).childNodes] }]);
  const details = el('div');
  details.append(
    el('h1', data.title),
    buildBlock('adventure-meta', meta),
    el('h2', 'Share this Adventure'),
    buildBlock('tabs', tabs),
  );

  return [crumbs, hero, details];
}

/**
 * Fetch an Adventure entry and replace the block's section with the rendered page.
 * @param {Element} block the block being decorated
 * @param {string} path entry path
 */
export default async function renderAdventure(block, path) {
  const section = block.closest('.section');

  let data;
  try {
    const resp = await fetch(entryUrl(path));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    ({ data } = await resp.json());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`adventure: could not load ${path}`, error);
  }
  if (!data?.title) {
    block.textContent = 'This adventure is not available right now.';
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
