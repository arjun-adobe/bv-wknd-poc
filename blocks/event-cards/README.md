# event-cards

Event cards for the events listing page (`/us/en/events`). Reads `/events-index.json`
(the `events` index in `helix-query.yaml`) and shows **upcoming** events (today or later),
soonest first. Each card: photo, date · city, name, price ("Free" for 0), summary.

## Authoring (Document Authoring)

A one-cell table named `event-cards`. Leave the cell empty for all upcoming events, or put a
number to show at most that many.

## Where the card data comes from

| Card | Index property | Source |
|---|---|---|
| Name, summary, photo | `title`, `description`, `image` | the event's row in the `/metadata` sheet |
| Date, city, price | `date`, `city`, `price`, `currency` | the event's form fields |

A new event appears after it's published (and its `/metadata` row is published first); past
events drop off automatically.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
