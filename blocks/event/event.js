/*
 * event
 * The block a published Event structured content entry carries (the block name is
 * the schema name). Renders the entry at its own URL from its JSON, reusing the
 * adventure page layout: breadcrumbs (Events) | carousel | h1 + facts (adventure-meta) + tabs.
 */
import { buildBlock } from '../../scripts/aem.js';
import {
  el, pagePath, picture, renderEntry,
} from '../../scripts/structured-content.js';
import { EVENTS_PATH, formatDate, formatPrice } from '../../scripts/event-format.js';

function renderOverview(paragraphs = []) {
  return paragraphs.map((t) => t.trim()).filter(Boolean).map((t) => el('p', t));
}

function renderAgenda(items = []) {
  return items.flatMap((item) => {
    const parts = [el('h3', item.time ? `${item.time} · ${item.title}` : item.title)];
    if (item.details) parts.push(el('p', item.details));
    return parts;
  });
}

function buildSections(data) {
  const events = el('a', 'Events');
  events.href = EVENTS_PATH;
  const crumbs = el('div');
  crumbs.append(buildBlock('breadcrumbs', [[events], [data.title]]));

  const hero = el('div');
  hero.append(buildBlock('carousel', (data.photos || [])
    .map((photo, i) => [{ elems: [picture(photo, i === 0)] }, ''])));

  const facts = [['Date', formatDate(data.date)]];
  if (data.city) facts.push(['City', data.city]);
  if (data.price !== undefined) facts.push(['Price', formatPrice(data.price, data.currency)]);

  const tabs = [];
  if (data.overview?.length) tabs.push(['Overview', { elems: renderOverview(data.overview) }]);
  if (data.agenda?.length) tabs.push(['Agenda', { elems: renderAgenda(data.agenda) }]);

  const details = el('div');
  details.append(el('h1', data.title), buildBlock('adventure-meta', facts), el('h2', 'Share this Event'));
  if (tabs.length) details.append(buildBlock('tabs', tabs));

  return [crumbs, hero, details];
}

export default async function decorate(block) {
  await renderEntry(block, pagePath(), buildSections, 'This event is not available right now.');
}
