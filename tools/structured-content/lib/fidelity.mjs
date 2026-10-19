// Ordered content comparison between an authored adventure page and an entry.
// Each tab becomes a list of units: the text of every paragraph, heading and list
// item, plus a marker per photo. Tag-agnostic on purpose (a bold stop name and a
// heading are the same unit), but order- and paragraph-sensitive.
import { parse } from 'node-html-parser';

const TABS = ['overview', 'itinerary', 'whatToBring'];
const media = (src) => (src || '').match(/media_[a-f0-9]+\.[a-z0-9]+/i)?.[0] || src;
const norm = (t) => t.replace(/\s+/g, ' ').trim();

/** Units per tab on the source page (.plain.html). */
export function sourceUnits(html) {
  const tabs = parse(html).querySelector('.tabs');
  return (tabs?.childNodes || []).filter((r) => r.nodeType === 1).map((row) => {
    const body = row.childNodes.filter((c) => c.nodeType === 1)[1];
    const units = [];
    // direct children, so bare text in a cell (no <p>) counts too, as the browser wraps it
    (body?.childNodes || []).forEach((n) => {
      const tag = n.tagName?.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        n.querySelectorAll('li').forEach((li) => { if (norm(li.text)) units.push(norm(li.text)); });
        return;
      }
      const img = n.querySelector?.('img');
      if (img) units.push(`[img ${media(img.getAttribute('src'))}]`);
      const t = norm(n.text || '');
      if (t) units.push(t);
    });
    return units;
  });
}

/** Units per tab in the order blocks/adventure-detail renders an entry. */
export function entryUnits(data) {
  return TABS.filter((t) => data[t]?.length).map((t) => data[t].flatMap((s) => {
    const units = s.heading ? [s.heading] : [];
    const img = s.image?.url ? [`[img ${media(s.image.url)}]`] : [];
    if (s.imagePosition !== 'Below text') units.push(...img);
    // legacy single text field: blank lines separate paragraphs
    const paragraphs = s.paragraphs || (s.text ? s.text.split(/\n\s*\n/) : []);
    units.push(...paragraphs.map(norm).filter(Boolean));
    if (s.imagePosition === 'Below text') units.push(...img);
    units.push(...(s.list || []).map(norm));
    return units;
  }));
}

/** First difference between two unit lists, or null when identical. */
export function firstDifference(page, entry) {
  for (let t = 0; t < Math.max(page.length, entry.length); t += 1) {
    const x = page[t] || [];
    const y = entry[t] || [];
    const i = x.findIndex((u, j) => u !== y[j]);
    if (i >= 0 || x.length !== y.length) {
      const k = i >= 0 ? i : Math.min(x.length, y.length);
      return `tab ${t + 1} item ${k + 1}: page "${(x[k] || '-').slice(0, 40)}" / entry "${(y[k] || '-').slice(0, 40)}"`;
    }
  }
  return null;
}
