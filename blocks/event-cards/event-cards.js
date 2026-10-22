import { createOptimizedPicture } from '../../scripts/aem.js';
import {
  EVENTS_PATH, formatDate, formatPrice, isUpcoming,
} from '../../scripts/event-format.js';

/*
 * event-cards
 * Index-driven event cards for the events listing. Fetches /events-index.json
 * (the `events` index in helix-query.yaml: page metadata + the entry's date, city,
 * price) and shows upcoming events, soonest first.
 *
 * Authoring (optional, in the block's first cell):
 *   - a number → show at most that many events (default: all upcoming)
 */

const INDEX_PATH = '/events-index.json';

async function fetchEvents() {
  try {
    const resp = await fetch(INDEX_PATH);
    if (!resp.ok) return [];
    const json = await resp.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    return [];
  }
}

function buildCard(entry) {
  const li = document.createElement('li');

  if (entry.image) {
    const imageLink = document.createElement('a');
    imageLink.className = 'event-cards-card-image';
    imageLink.href = entry.path;
    imageLink.append(createOptimizedPicture(entry.image, entry.title || '', false, [{ width: '750' }]));
    li.append(imageLink);
  }

  const body = document.createElement('div');
  body.className = 'event-cards-card-body';

  const when = document.createElement('p');
  when.className = 'event-cards-when';
  when.textContent = [formatDate(entry.date), entry.city].filter(Boolean).join(' · ');

  const h3 = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = entry.path;
  titleLink.textContent = entry.title || '';
  h3.append(titleLink);

  body.append(when, h3);

  const price = formatPrice(entry.price, entry.currency);
  if (price) {
    const p = document.createElement('p');
    p.className = 'event-cards-price';
    p.textContent = price;
    body.append(p);
  }
  if (entry.description) {
    const p = document.createElement('p');
    p.className = 'event-cards-description';
    p.textContent = entry.description;
    body.append(p);
  }

  li.append(body);
  return li;
}

export default async function decorate(block) {
  const cfg = block.textContent.trim();
  const limit = /^\d+$/.test(cfg) ? parseInt(cfg, 10) : Infinity;
  block.textContent = '';

  const events = (await fetchEvents())
    .filter((e) => e.path?.startsWith(`${EVENTS_PATH}/`) && isUpcoming(e.date))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.title || '').localeCompare(b.title || ''))
    .slice(0, limit);

  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'event-cards-empty';
    empty.textContent = 'No upcoming events right now. Check back soon.';
    block.append(empty);
    return;
  }

  const ul = document.createElement('ul');
  events.forEach((entry) => ul.append(buildCard(entry)));
  block.append(ul);
}
