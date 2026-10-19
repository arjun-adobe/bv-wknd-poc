/* eslint-disable */
/* global WebImporter */

// Thin adventure page for structured content: the page keeps only an
// adventure-detail block (pointing at the /adventures-data/<slug> entry) and
// page metadata (title, description, image) so the query index and cards stay
// populated. All visible content comes from the structured content entry.

const PAGE_TEMPLATE = {
  name: 'adventure-sc',
  description: 'Thin adventure page rendered from an Adventure structured content entry',
  urls: ['https://wknd.site/us/en/adventures/bali-surf-camp.html'],
};

// test pages live beside the authored ones until the block ships on main
const TARGET_FOLDER = '/us/en/adventures-sc';
const ENTRY_FOLDER = '/adventures-data';

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;
    const slug = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '')
      .split('/')
      .pop();

    // 1. metadata from the source <head> (title, description, og:image)
    const meta = document.createElement('div');
    WebImporter.rules.createMetadata(meta, document);

    // 2. replace the body with the adventure-detail block
    const link = document.createElement('a');
    link.href = `${ENTRY_FOLDER}/${slug}`;
    link.textContent = `${ENTRY_FOLDER}/${slug}`;
    const block = WebImporter.Blocks.createBlock(document, {
      name: 'adventure-detail',
      cells: [[link]],
    });
    main.innerHTML = '';
    main.append(block, ...meta.childNodes);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    return [{
      element: main,
      path: WebImporter.FileUtils.sanitizePath(`${TARGET_FOLDER}/${slug}`),
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        entry: `${ENTRY_FOLDER}/${slug}`,
      },
    }];
  },
};
