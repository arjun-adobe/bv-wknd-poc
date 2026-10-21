// Migrate authored adventure pages into Adventure structured content entries.
//
//   node tools/structured-content/migrate-adventures.mjs          dry run (all pages)
//   ... --apply                          create missing entries and publish them
//   ... --slugs bali-surf-camp,tahoe-skiing   limit to some pages
//   ... --apply --replace tahoe-skiing   also overwrite an existing entry
//   ... --source <dir>                   read authored pages from <dir> (.plain.html or .html)
//
// Source: authored adventure pages, by default content/us/en/adventures/<slug>.plain.html
// (output of the adventure-detail template import). Now that the live pages are entries,
// point --source at a copy of the authored originals instead
// (backups: DA /drafts/adventures-backup-2026-10-19).
// Target: /us/en/adventures/<slug> in DA (the entry is the page). Existing documents are
// never overwritten unless listed in --replace, because authors may have edited them in
// the form since the last migration. Run refresh-metadata.mjs afterwards for page metadata.
import { readFileSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { convertHtmlToJson, convertJsonToHtml, validationErrors } from './lib/sdk.mjs';
import { extractAdventure } from './lib/extract-adventure.mjs';
import { entryUnits, firstDifference, sourceUnits } from './lib/fidelity.mjs';
import {
  ENTRY_FOLDER, getDelivered, getSource, previewAndPublish, putSource, sameData,
} from './lib/da.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FOLDER = ENTRY_FOLDER;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const listArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] || '').split(',').filter(Boolean) : [];
};
const ONLY = listArg('--slugs');
const REPLACE = new Set(listArg('--replace'));
const PAGES = resolve(listArg('--source')[0] || join(HERE, '..', '..', 'content', 'us', 'en', 'adventures'));

const schema = JSON.parse(readFileSync(join(HERE, 'adventure.schema.json'), 'utf8'));
const files = Object.fromEntries(readdirSync(PAGES)
  .filter((f) => /\.(plain\.)?html$/.test(f))
  .map((f) => [f.replace(/(\.plain)?\.html$/, ''), f]));
const slugs = Object.keys(files).filter((s) => !ONLY.length || ONLY.includes(s)).sort();

let failures = 0;
for (const slug of slugs) {
  const html = readFileSync(join(PAGES, files[slug]), 'utf8');
  const path = `${FOLDER}/${slug}`;
  if (!html.includes('class="tabs"')) {
    failures += 1;
    console.log(`${slug}: FAIL not an authored adventure page (already switched over?) - use --source`);
    continue;
  }
  const json = extractAdventure(html, slug);
  const problems = [];

  const errors = validationErrors(schema, json);
  if (errors.length) problems.push(`invalid: ${errors.join(', ')}`);
  const { html: entryHtml, error } = convertJsonToHtml({ json });
  if (error || !sameData(convertHtmlToJson({ html: entryHtml }).json?.data, json.data)) problems.push('html round-trip changed the data');
  const diff = firstDifference(sourceUnits(html), entryUnits(json.data));
  if (diff) problems.push(`content differs from page at ${diff}`);

  let status = problems.length ? `FAIL ${problems.join('; ')}` : 'ok';
  if (APPLY && !problems.length) {
    const existing = await getSource(`${path}.html`);
    const existingData = existing && convertHtmlToJson({ html: existing }).json?.data;
    if (existing && sameData(existingData, json.data)) {
      status = 'ok, entry already up to date';
    } else if (existing && !REPLACE.has(slug)) {
      status = 'SKIPPED: entry exists and differs (may have been edited in the form); use --replace to overwrite';
    } else {
      await putSource(`${path}.html`, entryHtml);
      const { preview, live } = await previewAndPublish(path);
      const delivered = await getDelivered(path, 'live');
      const match = sameData(delivered?.data, json.data);
      if (!match) problems.push('published data differs from what was saved');
      status = `${existing ? 'replaced' : 'created'}, preview ${preview}, publish ${live}, live data ${match ? 'identical' : 'DIFFERS'}`;
    }
  }
  if (problems.length) failures += 1;
  console.log(`${slug}: ${status}`);
}
console.log(`\n${slugs.length - failures}/${slugs.length} ok${APPLY ? '' : ' (dry run - nothing written)'}`);
process.exitCode = failures ? 1 : 0;
