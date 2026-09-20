# Tool reference

Input/output reference for all **6 tools**. Types only - no internals. For conversation flows, see [examples/sample-calls.md](../examples/sample-calls.md).

Every tool is **read-only** and needs **no credentials**. Result lists are **capped** (default 10, max 30). All prices are in **Toman** (`price_toman: null` means negotiable - never 0).

Shared conventions:

- `limit` - how many items to return (default 10, max 30).
- `page` - 1-based page number, max 50. Page 2+ walks real pages (pagination continuation is handled server-side), so deeper pages cost extra requests - and one call walks at most 5 **new** pages, skipping the ones it already has in cache. A short walk is reported as `page_requested` / `page_returned` / `page_note`; call again to continue from where it stopped.
- `city` - English name (`tehran`, `mashhad`), Persian name or numeric id. `cities` takes up to 5 at once.
- `category` - Divar slug, e.g. `light` (cars), `mobile-phones`, `apartment-rent`, `apartment-sell`. Ask `divar_suggest` when unsure.

## `divar_suggest`

Vague wording to **real search terms, category slugs, city ids**. Call first when the wording is colloquial or when you need a `category` slug.

| Param | Type | Required | Notes |
|---|---|---|---|
| `query` | string | **yes** | What the user typed, e.g. `پراید`, `two-bedroom` |
| `city` | string | no | City name or id. Default `tehran` |

Returns: `categories` (slug + title + hint), `cities` (name + id), `districts` for the city, `guessed_category` (the leaf your wording most likely means - buy vs rent vs cars vs phones), and `category_filters` (per-leaf allow-list: the only extra keys `search_ads` accepts for that category).

## `search_ads`

Search ads, get **compact cards**: price in Toman, district, badges, photo/video flags, ad URL.

Which extra keys are honored **depends on the category** - each leaf has its own verified allow-list (returned by `divar_suggest` as `category_filters`). Keys a leaf does not support are dropped, not faked.

**Basics (all categories):**

| Param | Type | Notes |
|---|---|---|
| `query` | string | Persian or English, e.g. `پژو 206`, `iphone 13` |
| `category` | string | Slug, e.g. `light`, `mobile-phones`, `apartment-rent`, `apartment-sell` |
| `city` | string | Default `tehran` |
| `cities` | string[] | Up to 5 cities at once |
| `districts` | (string\|number)[] | District ids or exact names |
| `min_price_toman` / `max_price_toman` | number | Price window in Toman |
| `sort` | string | `newest` · `cheapest` · `most_expensive` |
| `exchange` | string | `only_exchanges` = swap-only · `exclude_exchanges` = hide swaps |
| `seller_type` | string | `personal` · `shop` (goods; sent as `marketplace`) · `real-estate-business` (property). Cars accept **`personal` only** - a `shop` request there comes back in `filters_not_applied` with `seller_type_note` instead of a page that quietly ignored it |
| `only_photo` | boolean | Only ads with at least one photo |
| `only_video` | boolean | Filters the **fetched page** - Divar's API has no server-side video filter |
| `page` | number | 1-based (default 1, max 50) |
| `limit` | number | Default 10, max 30 |

**Cars (`light`, alias `cars`/`vehicles`):**

| Param | Type | Notes |
|---|---|---|
| `brand_model` | string | Exact model, resolved from Divar's own list. Unknown text falls back to plain text search |
| `min_mileage_km` / `max_mileage_km` | number | Mileage range in km |

**Phones (`mobile-phones`):**

| Param | Type | Notes |
|---|---|---|
| `brand_model` | string | Exact model from Divar's list |
| `condition` | string | `new` · `like-new` · `used` · `repair-needed` |
| `min_storage_gb` / `max_storage_gb` | number | Internal storage window in GB |
| `min_ram_gb` / `max_ram_gb` | number | RAM window in GB |
| `color` | string | Base color, Persian or English |
| `sim_slots` | string | `1` · `2` · `3+` |
| `installment` | boolean | Installment sale only |

**Homes - rent (`apartment-rent`, `residential-rent`) and buy (`apartment-sell`, `house-villa-sell`, `residential-sell`, `commercial-sell`, `office-sell`, `shop-sell`, `plot-old`):**

| Param | Type | Notes |
|---|---|---|
| `min_size_sqm` / `max_size_sqm` | number | Area window in sqm |
| `rooms` | string[] | Room-count words in Persian, e.g. `["دو"]`, `["سه"]` |
| `min_credit_toman` / `max_credit_toman` | number | **Rent only:** deposit (rahn) window in Toman |
| `min_rent_toman` / `max_rent_toman` | number | **Rent only:** monthly rent window in Toman |
| `parking` / `elevator` / `warehouse` / `balcony` | boolean | Amenities |

Each buy leaf honors a **verified subset** of the home keys - e.g. `elevator` is valid on `apartment-sell`/`office-sell` but not on `house-villa-sell`; `rooms` is valid on `apartment-sell`/`office-sell`/`shop-sell` but not on `residential-sell`/`commercial-sell`/`plot-old`. Anything a leaf rejects upstream is dropped rather than sent. `-sale` slugs (`apartment-sale`, `house-villa-sale`, …) fold to their `-sell` leaf automatically.

Deliberately absent (probe-tested, do nothing on the API): urgent-only, shop-only search, car production year, server-side video-only.

Budget questions (`"best X under Y"`) belong to **`find_best_value`**, not here - plain search only walks the pages you ask for.

## `ad_details`

**Everything about one ad**: price, description, specs, photos, tags, map - **never a phone number**.

| Param | Type | Required | Notes |
|---|---|---|---|
| `token` | string | **yes** | The ad token from a card |
| `detail` | string | no | `compact` = decision facts only (title, price, city, url); `full` = everything (default) |

## `get_ads_batch`

Shortlist cards for **up to 10 tokens** - feeds `compare_ads`. Repeated tokens are fetched once. A dead token (sold/removed) lands in `missing_tokens`; a token that is not even shaped like a Divar ad token lands in `invalid_tokens` (that one is the caller's typo - copy it again, retrying it cannot help); a token that could not be fetched because Divar was throttling lands in `partial_failures` with the real reason - a throttle is never reported as a sold ad. A call whose tokens are all malformed fails as a usage error.

| Param | Type | Required | Notes |
|---|---|---|---|
| `tokens` | string[] | **yes** | 1 to 10 ad tokens |

## `compare_ads`

**2-5 ads side by side**: price spread plus **only the specs that actually differ** (identical rows are dropped). Same split as `get_ads_batch`: `missing_tokens` for ads that are gone, `invalid_tokens` for tokens that are not Divar ad tokens at all, `partial_failures` for ads blocked by a throttle - a typo is never blamed on Divar. If fewer than two ads resolve, the error names which token was which.

| Param | Type | Required | Notes |
|---|---|---|---|
| `tokens` | string[] | **yes** | 2 to 5 ad tokens |

## `find_best_value`

**"Best X under Y Toman"**. Walks up to 3 search pages until the budget is exhausted, keeps what fits, then **ranks cheapest-first** with photo and chat bonuses.

| Param | Type | Required | Notes |
|---|---|---|---|
| `query` | string | **yes** | E.g. `پراید`, `two-bedroom apartment` |
| `budget_toman` | number | **yes** | Maximum price in Toman (not Rial) |
| `city` | string | no | Default `tehran` |
| `cities` | string[] | no | Up to 5 cities at once, names or ids |
| `category` | string | no | Slug to narrow the hunt |
| `limit` | number | no | How many picks (default 3, max 10) |
| `include_negotiable` | boolean | no | Also surface "توافقی" ads: they rank **last** with `price_toman: null` and a why line that says ask the seller (default false) |

For cars and homes: compare the specs yourself - prices are negotiable and ads sell fast.

## Prompts (request templates)

Two ready-made flows a client can offer as slash-commands - the server renders them into a steer message for the agent:

| Prompt | Arguments | Renders into |
|---|---|---|
| `compare-ads` | `tokens` (comma-separated, required) | get_ads_batch → compare_ads, with a report of the price spread and real differences |
| `best-under-budget` | `thing`, `budget` (required), `city` (optional) | divar_suggest → find_best_value, shortlist of URLs at the end |

## Resources (read-only reference data)

Static tables the server can serve on demand - `divar://` URIs, JSON:

- **`divar://cities`** - english slug → numeric city id for every searchable city
- **`divar://cities-fa`** - Persian name → city id
- **`divar://category-filters`** - which filter keys each category accepts (sending unknown keys is a 400)
- **`divar://category-filters/{slug}`** - the same for one category, e.g. `divar://category-filters/apartment-rent`
