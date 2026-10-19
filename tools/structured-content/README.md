# Structured content tools (Adventure)

Node scripts used to set up and migrate adventure pages to DA structured content.
They talk to `admin.da.live`, `admin.hlx.page` and the structured content delivery
endpoint; no credentials are stored here (the environment's auth is used).

| File | Purpose |
|---|---|
| `adventure.schema.json` | The **Adventure** schema (source of truth for `/.da/forms/schemas/adventure`). |
| `save-schema.mjs` | Validate the schema with the SDK and save it to DA. Won't overwrite a copy edited in the Schema Editor without `--force`. |
| `migrate-adventures.mjs` | Turn `content/us/en/adventures/*.plain.html` into `/adventures-data/<slug>` entries: validate, check content order against the page, create, publish, verify the published data. Never overwrites an existing entry unless listed in `--replace`. |
| `check-delivery.mjs` | For every entry, check the preview and live JSON match what is saved in DA, and that it is valid. |
| `lib/sdk.mjs` | Loads Adobe's `da-sc-sdk` (the library the DA form editor uses), pinned to a da-nx commit and checksum-verified, cached in `.cache/`. |
| `lib/extract-adventure.mjs` | Page → entry mapping. |
| `lib/fidelity.mjs` | Ordered page-vs-entry content comparison (paragraphs, headings, list items, photos). |
| `lib/da.mjs` | DA / admin / delivery helpers. |

Pages for entries are generated with `tools/importer/import-adventure-sc.js` (block reference,
the entry's text for crawlers, and metadata), via the importer's bundle + bulk-import steps.

## Usage

```sh
npm i                                                        # dev dependencies (node-html-parser)
node tools/structured-content/save-schema.mjs                # dry run
node tools/structured-content/migrate-adventures.mjs         # dry run, all pages
node tools/structured-content/migrate-adventures.mjs --apply --slugs bali-surf-camp
node tools/structured-content/check-delivery.mjs
```

## Lessons baked in

- Validate the full `{ metadata, data }` entry, the shape the form editor loads.
- Don't mark a field required inside an optional object: the form always renders the object.
- Line breaks inside one field are collapsed on publish; store paragraphs as a list.
- Compare decoded entries, not raw HTML: nested-object reference ids change on every save.
- Check content **order**, not just text: a list always renders last in a section.
