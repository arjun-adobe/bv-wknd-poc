// Page metadata for Adventure entry pages. The form editor can't hold page metadata
// (a metadata block added via canvas# is dropped on the next form save), so each entry
// page gets one exact-URL row in the bulk metadata sheet (/metadata): Title = name,
// Description = summary, Image = first hero photo. Re-run after editing those fields.
//
//   node tools/structured-content/refresh-metadata.mjs            dry run: show changes
//   node tools/structured-content/refresh-metadata.mjs --apply    save, preview and publish
//
// Rows for other URLs are kept as they are.
import { convertHtmlToJson } from './lib/sdk.mjs';
import {
  ENTRY_FOLDER, getSource, listFolder, previewAndPublish, putSource,
} from './lib/da.mjs';

const APPLY = process.argv.includes('--apply');
const SHEET = '/metadata.json';
const COLUMNS = ['Title', 'Description', 'Image'];

const wanted = [];
for (const slug of await listFolder(ENTRY_FOLDER)) {
  const html = await getSource(`${ENTRY_FOLDER}/${slug}.html`);
  if (!html.includes('class="da-form"')) continue; // not an entry
  const { data } = convertHtmlToJson({ html }).json;
  wanted.push({
    URL: `${ENTRY_FOLDER}/${slug}`,
    Title: data.title || '',
    Description: data.summary || '',
    Image: data.photos?.[0]?.url || '',
  });
}

const sheet = JSON.parse(await getSource(SHEET));
const keys = [...new Set([...sheet.data.flatMap((r) => Object.keys(r)), 'URL', ...COLUMNS])];
const pad = (row) => Object.fromEntries(keys.map((k) => [k, row[k] ?? '']));
const byUrl = new Map(sheet.data.map((r) => [r.URL, r]));

let changes = 0;
for (const row of wanted) {
  const current = byUrl.get(row.URL);
  const next = pad({ ...current, ...row });
  if (!current) console.log(`add    ${row.URL}: ${row.Title}`);
  else if (COLUMNS.some((c) => (current[c] ?? '') !== next[c])) console.log(`update ${row.URL}: ${COLUMNS.filter((c) => (current[c] ?? '') !== next[c]).join(', ')}`);
  else continue;
  changes += 1;
  byUrl.set(row.URL, next);
}
console.log(`${wanted.length} entries, ${changes} row(s) to add or update`);

if (APPLY && changes) {
  const rows = [...byUrl.values()].map(pad);
  await putSource(SHEET, JSON.stringify({
    ...sheet, total: rows.length, limit: rows.length, data: rows,
  }), 'application/json');
  const { preview, live } = await previewAndPublish(SHEET);
  console.log(`saved; preview ${preview}, publish ${live}`);
}
