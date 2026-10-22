/*
 * Adventure rendering for the adventure block (an entry rendered at its own URL).
 *
 * Turns an Adventure structured content entry into the same sections and blocks
 * an authored adventure page has (breadcrumbs | carousel | h1 + adventure-meta +
 * tabs), so the existing block code and section layout CSS apply unchanged.
 */
import { buildBlock } from './aem.js';
import { el, picture, renderEntry } from './structured-content.js';

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
  await renderEntry(block, path, buildSections, 'This adventure is not available right now.');
}
