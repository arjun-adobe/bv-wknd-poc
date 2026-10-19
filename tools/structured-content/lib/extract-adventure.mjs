// Map an adventure page (.plain.html) to the Adventure structured-content JSON.
import { parse } from 'node-html-parser';

const SITE_MEDIA = 'https://main--bv-wknd-poc--arjun-adobe.aem.live/';
const META_FIELDS = {
  Activity: 'activity',
  'Adventure Type': 'adventureType',
  'Trip Length': 'tripLength',
  'Group Size': 'groupSize',
  Difficulty: 'difficulty',
  Price: 'price',
};
const TABS = { Overview: 'overview', Itinerary: 'itinerary', 'What to Bring': 'whatToBring' };

const clean = (s) => s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

// point images at this site's media bus (same content hash, own origin)
function imageOf(picture) {
  const img = picture.querySelector('img');
  if (!img) return null;
  const src = img.getAttribute('src') || '';
  const media = src.match(/media_[a-f0-9]+\.[a-z0-9]+/i)?.[0];
  const url = media ? `${SITE_MEDIA}${media}` : src.split('?')[0];
  const alt = clean(img.getAttribute('alt') || '');
  return alt ? { url, alt } : { url };
}

// a tab body is a run of sections: a new section starts at a heading, at a
// bold-only paragraph (stop names), or at a second photo
function sectionsOf(body) {
  const sections = [];
  let cur = null;
  const start = (heading) => {
    cur = { paragraphs: [] };
    if (heading) cur.heading = heading;
    sections.push(cur);
  };
  const ensure = () => { if (!cur) start(); };
  // text after a "below text" photo belongs to a new section, so source order is kept
  // a list always renders last in a section, so anything after a list starts a new section
  const ensureText = () => { if (!cur || cur.list || (cur.image && cur.imagePosition === 'Below text')) start(); };

  for (const el of body.childNodes) {
    if (el.nodeType !== 1) {
      const t = clean(el.text || '');
      if (t) { ensureText(); cur.paragraphs.push(t); }
      continue;
    }
    const tag = el.tagName.toLowerCase();
    const picture = tag === 'picture' ? el : el.querySelector('picture');
    if (/^h[1-6]$/.test(tag)) { start(clean(el.text)); continue; }
    if (tag === 'p' && el.childNodes.length === 1 && el.firstChild.tagName?.toLowerCase() === 'strong') {
      start(clean(el.text)); continue;
    }
    if (picture && !clean(el.text)) {
      if (!cur || cur.image || cur.list) start();
      cur.image = imageOf(picture);
      cur.imagePosition = cur.paragraphs.length ? 'Below text' : 'Above text';
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      ensure();
      cur.list = [...(cur.list || []), ...el.querySelectorAll('li').map((li) => clean(li.text)).filter(Boolean)];
      continue;
    }
    const t = clean(el.text);
    if (t) { ensureText(); cur.paragraphs.push(t); }
  }
  return sections.map(({ paragraphs, ...s }) => {
    const out = { ...s };
    // one array item per paragraph: line breaks inside a field don't survive publishing
    if (paragraphs.length) out.paragraphs = paragraphs;
    if (!out.image) delete out.imagePosition;
    return out;
  });
}

export function extractAdventure(html, slug) {
  const root = parse(html);
  const data = { title: clean(root.querySelector('h1')?.text || ''), slug };

  root.querySelector('.metadata')?.childNodes.filter((r) => r.nodeType === 1).forEach((row) => {
    const [k, v] = row.childNodes.filter((c) => c.nodeType === 1).map((c) => clean(c.text));
    if (k === 'Description') data.summary = v;
  });

  root.querySelector('.adventure-meta')?.childNodes.filter((r) => r.nodeType === 1).forEach((row) => {
    const [k, v] = row.childNodes.filter((c) => c.nodeType === 1).map((c) => clean(c.text));
    const field = META_FIELDS[k];
    if (!field) return;
    if (field === 'groupSize') data[field] = parseInt(v, 10);
    else if (field === 'price') data[field] = Number(v);
    else if (field === 'tripLength') data[field] = v.replace(/\bdays?\b/i, (d) => d[0].toUpperCase() + d.slice(1));
    else data[field] = v;
  });
  data.currency = 'USD';

  data.photos = (root.querySelector('.carousel')?.querySelectorAll('picture') || []).map(imageOf).filter(Boolean);

  const tabs = root.querySelector('.tabs');
  tabs?.childNodes.filter((r) => r.nodeType === 1).forEach((row) => {
    const [labelCell, bodyCell] = row.childNodes.filter((c) => c.nodeType === 1);
    const field = TABS[clean(labelCell?.text || '')];
    if (field && bodyCell) data[field] = sectionsOf(bodyCell);
  });

  return { metadata: { title: slug, schemaName: 'adventure' }, data };
}
