# event

Renders an **Event** structured content entry at its own URL (`/us/en/events/<slug>`).
A published entry carries a block named after its schema (`event`); this block fetches
the entry's JSON and lays it out like an adventure page.

## Authoring

Open `https://da.live/#/arjun-adobe/bv-wknd-poc/us/en/events`, click **+ → Document**, pick
the **Event** schema and fill in the form (`editor.path` makes that folder open as a form).

| Field | Shown as |
|---|---|
| Event name* | Page heading, breadcrumb |
| Date* | Facts: "Sat, 14 Nov 2026" |
| City | Facts |
| Price, Currency | Facts: "$25", or "Free" for 0 |
| Summary* | Not on the page: used for page metadata (description, cards, link previews) |
| Photos* (1–6) | Carousel (image URLs from this site, plus alt text) |
| Overview | Overview tab, one paragraph per item |
| Agenda | Agenda tab: "time · what happens", then details |

Page metadata (Title, Description, Image) lives in the bulk `/metadata` sheet, one row per
event; `tools/structured-content/refresh-metadata.mjs --folder /us/en/events`
writes it from the entries. Publish the sheet before the event so its card data is right.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
