/* eslint-disable */
/* global WebImporter */

// Adventure page for structured content. Source URL is the entry itself
// (https://main--bv-wknd-poc--arjun-adobe.aem.page/adventures-data/<slug>), so
// adventures created only in the form editor can get a page too.
//
// The page holds, in one section:
//  - an adventure-detail block pointing at the entry (renders the page in the browser)
//  - the entry's text as plain default content (title, summary, facts, every tab's
//    headings, paragraphs and lists), so the server HTML carries the content for
//    crawlers that don't run JavaScript. The block replaces the whole section, so
//    visitors only ever see the rendering from the live entry.
//  - page metadata (title, description, first hero photo) for the index and cards.
// Re-run this import after an entry is edited to refresh the server-side text.

const PAGE_TEMPLATE = {
  name: 'adventure-sc',
  description: 'Adventure page rendered from an Adventure structured content entry',
  urls: ['https://main--bv-wknd-poc--arjun-adobe.aem.page/adventures-data/bali-surf-camp'],
};

// test pages live beside the authored ones until the block ships on main
const TARGET_FOLDER = '/us/en/adventures-sc';
const ENTRY_FOLDER = '/adventures-data';

const FACTS = [
  ['Activity', 'activity'],
  ['Adventure Type', 'adventureType'],
  ['Trip Length', 'tripLength'],
  ['Group Size', 'groupSize'],
  ['Difficulty', 'difficulty'],
  ['Price', 'price'],
];
const TABS = [['Overview', 'overview'], ['Itinerary', 'itinerary'], ['What to Bring', 'whatToBring']];

// Decode a stored entry block back into an object. Rows are
// <div><div><h3>key</h3></div><div>value</div></div>; lists are <ul><li>; nested
// objects are "self://#<id>" references to sibling blocks with class <id>.
function decodeBlock(document, block) {
  const value = (text) => {
    const ref = text.trim().match(/^self:\/\/#(.+)$/);
    return ref ? decodeBlock(document, document.querySelector(`.${ref[1]}`)) : text.trim();
  };
  const out = {};
  if (!block) return out;
  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    const key = keyCell && keyCell.textContent.trim();
    if (!key || !valueCell) return;
    const list = valueCell.querySelector('ul');
    out[key] = list ? [...list.children].map((li) => value(li.textContent)) : value(valueCell.textContent);
  });
  return out;
}

function el(document, tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

// keep the authored-page price format (5000.0, 152.59), as the block does
const formatPrice = (p) => (/^\d+$/.test(p) ? `${p}.0` : p);

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const main = document.body;
    const slug = new URL(params.originalURL).pathname.replace(/\/$/, '').split('/').pop();
    const data = decodeBlock(document, document.querySelector('.adventure'));

    const link = document.createElement('a');
    link.href = `${ENTRY_FOLDER}/${slug}`;
    link.textContent = `${ENTRY_FOLDER}/${slug}`;
    const block = WebImporter.Blocks.createBlock(document, {
      name: 'adventure-detail',
      cells: [[link]],
    });

    // server-side text, replaced by the block's rendering in the browser
    const text = [el(document, 'h1', data.title || slug)];
    if (data.summary) text.push(el(document, 'p', data.summary));
    const facts = document.createElement('ul');
    FACTS.forEach(([label, key]) => {
      if (data[key]) facts.append(el(document, 'li', `${label}: ${key === 'price' ? formatPrice(data[key]) : data[key]}`));
    });
    if (facts.children.length) text.push(facts);
    TABS.forEach(([label, key]) => {
      const sections = Array.isArray(data[key]) ? data[key] : [];
      if (!sections.length) return;
      text.push(el(document, 'h2', label));
      sections.forEach((s) => {
        if (s.heading) text.push(el(document, 'h3', s.heading));
        (Array.isArray(s.paragraphs) ? s.paragraphs : []).forEach((p) => text.push(el(document, 'p', p)));
        if (Array.isArray(s.list) && s.list.length) {
          const ul = document.createElement('ul');
          s.list.forEach((item) => ul.append(el(document, 'li', item)));
          text.push(ul);
        }
      });
    });

    const metadata = { Title: data.title || slug, Description: data.summary || '' };
    const photo = Array.isArray(data.photos) ? data.photos[0] : null;
    if (photo && photo.url) {
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.alt || metadata.Title;
      metadata.Image = img;
    }

    main.innerHTML = '';
    main.append(block, ...text, WebImporter.Blocks.getMetadataBlock(document, metadata));

    return [{
      element: main,
      path: WebImporter.FileUtils.sanitizePath(`${TARGET_FOLDER}/${data.slug || slug}`),
      report: {
        title: metadata.Title,
        template: PAGE_TEMPLATE.name,
        entry: `${ENTRY_FOLDER}/${slug}`,
        hasImage: !!metadata.Image,
      },
    }];
  },
};
