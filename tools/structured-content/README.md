# Structured content tools (Adventure)

Node scripts used to set up and migrate adventure pages to DA structured content.
They talk to `admin.da.live`, `admin.hlx.page` and the structured content delivery
endpoint; no credentials are stored here (the environment's auth is used).

Each adventure is **one document**: the structured content entry at
`/us/en/adventures/<slug>` is the page. It carries an `adventure` block (the schema name),
which renders the page from the entry's JSON. Authors edit it in the form editor
(`editor.path` = `/arjun-adobe/bv-wknd-poc/us/en/adventures=https://da.live/form#`;
the `/us/en/adventures` listing page lives in the `/us/en` folder, so it isn't affected).

| File | Purpose |
|---|---|
| `adventure.schema.json`, `event.schema.json` | The **Adventure** and **Event** schemas (source of truth for `/.da/forms/schemas/<name>`). Events live at `/us/en/events/<slug>` and render with the `event` block. |
| `save-schema.mjs` | Validate a schema with the SDK and save it to DA (`--name event`; default `adventure`). Won't overwrite a copy edited in the Schema Editor without `--force`. |
| `migrate-adventures.mjs` | Turn authored adventure pages into entries at `/us/en/adventures/<slug>`: validate, check content order against the page, create, publish, verify the published data. Never overwrites an existing document unless listed in `--replace`. |
| `refresh-metadata.mjs` | Write one exact-URL row per entry page (Title, Description = summary, first photo as Image) to the bulk metadata sheet (`--folder /us/en/events`; default adventures). The form can't hold page metadata, so re-run after editing an entry's title, summary or first photo. |
| `check-delivery.mjs` | For every entry, check the preview and live JSON match what is saved in DA, and that it is valid (`--folder /us/en/events --schema event`). |
| `lib/sdk.mjs` | Loads Adobe's `da-sc-sdk` (the library the DA form editor uses), pinned to a da-nx commit and checksum-verified, cached in `.cache/`. |
| `lib/extract-adventure.mjs` | Page → entry mapping. |
| `lib/fidelity.mjs` | Ordered page-vs-entry content comparison (paragraphs, headings, list items, photos). |
| `lib/da.mjs` | DA / admin / delivery helpers. |

## Usage

```sh
npm i                                                        # dev dependencies (node-html-parser)
node tools/structured-content/save-schema.mjs                # dry run
node tools/structured-content/migrate-adventures.mjs --source <dir-of-authored-pages>
node tools/structured-content/refresh-metadata.mjs           # dry run; --apply to save + publish
node tools/structured-content/check-delivery.mjs
```

`content/us/en/adventures/` no longer holds the authored originals. To re-run a migration,
point `--source` at copies of them (backed up in DA at `/drafts/adventures-backup-2026-10-19/`).

## Lessons baked in

- Validate the full `{ metadata, data }` entry, the shape the form editor loads.
- Don't mark a field required inside an optional object: the form always renders the object.
- Line breaks inside one field are collapsed on publish; store paragraphs as a list.
- Compare decoded entries, not raw HTML: nested-object reference ids change on every save.
- Check content **order**, not just text: a list always renders last in a section.
- Page metadata can't live in the entry (the form rewrites the document on save); use the
  bulk metadata sheet.
- `editor.path` is a plain prefix matched against the **folder being browsed** (no trailing
  slash), not the clicked document; every document listed in that folder opens with the
  matched editor. Don't end folder rules with `/`.
