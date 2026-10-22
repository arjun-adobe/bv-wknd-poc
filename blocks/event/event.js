/*
 * event
 * The block a published Event structured content entry carries (the block name is
 * the schema name). Renders the entry at its own URL from its JSON, reusing the
 * adventure page layout: breadcrumbs | carousel | h1 + facts (adventure-meta) + tabs.
 */
import { buildBlock } from '../../scripts/aem.js';
import {
  el, pagePath, picture, renderEntry,
} from '../../scripts/structured-content.js';

const HOME_PATH = '/us/en';

/** 2026-11-14 -> "Sat, 14 Nov 2026" (dates are calendar days, so format in UTC). */
function formatDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`;
}

function formatPrice(price, currency = 'USD') {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}

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
  const home = el('a', 'Home');
  home.href = HOME_PATH;
  const crumbs = el('div');
  crumbs.append(buildBlock('breadcrumbs', [[home], [data.title]]));

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
