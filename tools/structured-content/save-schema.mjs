// Save adventure.schema.json as the "adventure" schema in DA, in the format the DA
// Schema Editor writes (/.da/forms/schemas/<name>.html, JSON inside <pre><code>).
//
//   node tools/structured-content/save-schema.mjs   dry run: validate and compare with DA
//   ... --apply           save if missing in DA
//   ... --apply --force   overwrite a DA copy that differs (e.g. edited in the Schema Editor)
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { validateSchema } from './lib/sdk.mjs';
import { getSource, putSource, sameData } from './lib/da.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const NAME = 'adventure';
const PATH = `/.da/forms/schemas/${NAME}.html`;
const SHELL = '<body><header></header><main><div><pre><code>{{JSON}}</code></pre></div></main><footer></footer></body>';
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

const encode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const schema = JSON.parse(readFileSync(join(HERE, 'adventure.schema.json'), 'utf8'));
const { valid, schemaIssues } = validateSchema({ schema });
if (!valid) {
  console.error('schema invalid:', JSON.stringify(schemaIssues));
  process.exit(1);
}

const storedHtml = await getSource(PATH);
const stored = storedHtml && JSON.parse(decode(storedHtml.match(/<code>([\s\S]*?)<\/code>/)?.[1] || 'null'));
let state = 'missing in DA';
if (stored) state = sameData(stored, schema) ? 'identical in DA' : 'differs from DA';
console.log(`schema "${NAME}": valid, ${state}`);

if (APPLY && state !== 'identical in DA') {
  if (state === 'differs from DA' && !FORCE) {
    console.log('not saved: the DA copy differs (possibly edited in the Schema Editor). Review it, then re-run with --force.');
    process.exit(1);
  }
  console.log('saved:', await putSource(PATH, SHELL.replace('{{JSON}}', () => encode(JSON.stringify(schema, null, 2)))));
}
