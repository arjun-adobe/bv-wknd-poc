# adventure-detail

Custom **adventure-detail** block. Renders a full adventure page from a structured content entry.

## Authoring (Document Authoring)

Model: `standalone`

One row, one cell: a link (or path) to the entry, e.g. `/adventures-data/bali-surf-camp`.

The entry itself is edited in the form editor (`https://da.live/form#/arjun-adobe/bv-wknd-poc/adventures-data/<slug>`) using the **Adventure** schema. Keep page metadata (Title, Description, Image) on the page so the query index and cards stay populated.

## Rendering

Fetches `https://da-sc.adobeaem.workers.dev/{preview|live}/{org}/{site}/adventures-data/<slug>` (live on `.aem.live`, preview elsewhere) and builds the same breadcrumbs, carousel, adventure-meta and tabs blocks an authored adventure page has.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
