# adventure-detail

Custom **adventure-detail** block. Renders a full adventure page from an **Adventure** structured content entry.

## Authoring (Document Authoring)

Model: `standalone`

One row, one cell: a link (or path) to the entry, e.g. `/adventures-data/bali-surf-camp`. Keep page metadata (Title, Description, Image) on the page so the query index and cards stay populated.

### Editing an adventure

Open the entry in the form editor: `https://da.live/form#/arjun-adobe/bv-wknd-poc/adventures-data/<slug>`

- **Facts**: name, slug, summary, activity, adventure type, trip length (`6 Days`, `2-3 Days`), group size, difficulty, price, currency.
- **Hero photos**: 1–6 photos for the carousel (image URL + alt text). URL is required.
- **Overview / Itinerary / What to Bring**: a list of sections. Each section has an optional heading, a **Paragraphs** list (one item per paragraph), an optional photo with position (above/below text), and an optional bullet list.
  - Use one Paragraphs item per paragraph. Line breaks inside a single field are collapsed on publish.
  - A section always renders heading → photo (above) → paragraphs → photo (below) → list. Start a new section for content that should come after a list.
- Images are plain URLs (no asset picker). Use this site's media URLs, e.g. `https://main--bv-wknd-poc--arjun-adobe.aem.live/media_<hash>.jpg`.

Preview and publish the entry (the form editor's Send → Publish); the page picks up the change without being republished. Previewing an entry opens JSON, not a page.

### New adventure

1. Create the entry in `/adventures-data/` with the Adventure schema.
2. Create the page: run `tools/importer/import-adventure-sc.js` with the entry URL (`https://main--bv-wknd-poc--arjun-adobe.aem.page/adventures-data/<slug>`) — it writes the block reference and metadata from the entry.
3. Preview and publish the page.

## Rendering

Fetches `https://da-sc.adobeaem.workers.dev/{preview|live}/{org}/{site}/adventures-data/<slug>` (live on `.aem.live`, preview elsewhere) and builds the same breadcrumbs, carousel, adventure-meta and tabs blocks an authored adventure page has, so their code and the section layout CSS apply unchanged. If the entry can't be loaded, a short fallback message is shown.

Content is rendered client-side: the page HTML carries only the metadata, not the adventure text.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
