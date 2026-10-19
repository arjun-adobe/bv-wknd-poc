/* eslint-disable */
/* global WebImporter */

// Thin adventure page for structured content. Source URL is the entry itself
// (https://main--bv-wknd-poc--arjun-adobe.aem.page/adventures-data/<slug>), so
// adventures created only in the form editor can get a page too. The page keeps
// an adventure-detail block (pointing at the entry) plus page metadata (title,
// description, first hero photo) taken from the entry, so the query index and
// cards stay populated. All visible content is rendered from the entry.

const PAGE_TEMPLATE = {
  name: 'adventure-sc',
  description: 'Thin adventure page rendered from an Adventure structured content entry',
  urls: ['https://main--bv-wknd-poc--arjun-adobe.aem.page/adventures-data/bali-surf-camp'],
};

// test pages live beside the authored ones until the block ships on main
const TARGET_FOLDER = '/us/en/adventures-sc';
const ENTRY_FOLDER = '/adventures-data';

// rows of a stored entry block: <div><div><h3>key</h3></div><div>value</div></div>
function readRows(block) {
  const values = {};
  if (!block) return values;
  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    const key = keyCell && keyCell.textContent.trim();
    if (key && valueCell) values[key] = valueCell;
  });
  return values;
}

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const main = document.body;
    const slug = new URL(params.originalURL).pathname.replace(/\/$/, '').split('/').pop();

    const entry = readRows(document.querySelector('.adventure'));
    const text = (key) => (entry[key] ? entry[key].textContent.trim() : '');

    // nested objects are stored as self://#<id> references to sibling blocks
    let image;
    const ref = entry.photos && entry.photos.querySelector('li');
    const refId = ref && ref.textContent.trim().replace('self://#', '');
    const photo = refId ? readRows(document.querySelector(`.${refId}`)) : {};
    if (photo.url) {
      image = document.createElement('img');
      image.src = photo.url.textContent.trim();
      image.alt = photo.alt ? photo.alt.textContent.trim() : text('title');
    }

    const link = document.createElement('a');
    link.href = `${ENTRY_FOLDER}/${slug}`;
    link.textContent = `${ENTRY_FOLDER}/${slug}`;
    const block = WebImporter.Blocks.createBlock(document, {
      name: 'adventure-detail',
      cells: [[link]],
    });

    const metadata = { Title: text('title'), Description: text('summary') };
    if (image) metadata.Image = image;
    const meta = WebImporter.Blocks.getMetadataBlock(document, metadata);

    main.innerHTML = '';
    main.append(block, meta);

    return [{
      element: main,
      path: WebImporter.FileUtils.sanitizePath(`${TARGET_FOLDER}/${text('slug') || slug}`),
      report: {
        title: metadata.Title,
        template: PAGE_TEMPLATE.name,
        entry: `${ENTRY_FOLDER}/${slug}`,
        hasImage: !!image,
      },
    }];
  },
};
