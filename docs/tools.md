# Tool reference

Input/output reference for all **6 tools**. Types only - no internals. For conversation flows, see [examples/sample-calls.md](../examples/sample-calls.md).

Every tool is **read-only** and needs **no credentials**. Result lists are **capped** (default 10, max 24). All prices are in **Toman** (`price_toman: null` means negotiable - never 0).

Shared conventions:

- `limit` - how many items to return (default 10, max 24).
- `page` - 1-based page number. Page 2+ walks real pages (pagination continuation is handled server-side).
- `city` - English name (`tehran`, `mashhad`), Persian name or numeric id. `cities` takes up to 5 at once.
- `category` - Divar slug, e.g. `light` (cars), `mobile-phones`, `apartment-rent`. Ask `divar_suggest` when unsure.

## `divar_suggest`

Vague wording to **real search terms, category slugs, city ids**. Call first when the wording is colloquial or when you need a `category` slug.

| Param | Type | Required | Notes |
|---|---|---|---|
| `query` | string | **yes** | What the user typed, e.g. `پراید`, `two-bedroom` |
| `city` | string | no | City name or id. Default `tehran` |

Returns: `categories` (slug + title + hint), `cities` (name + id), `districts` for the city, `category_filters` (the only extra keys `search_ads` accepts).

## `search_ads`

Search ads, get **compact cards**: price in Toman, district, badges, photo/video flags, ad URL.

| Param | Type | Required | Notes |
|---|---|---|---|
| `query` | string | no | Persian or English, e.g. `پژو 206`, `iphone 13` |
| `category` | string | no | Slug, e.g. `light`, `mobile-phones`, `apartment-rent` |
| `city` | string | no | Default `tehran` |
| `cities` | string[] | no | Up to 5 cities at once |
| `districts` | (string\|number)[] | no | District ids or exact names |
| `min_price_toman` | number | no | Minimum in Toman |
| `max_price_toman` | number | no | Maximum in Toman |
| `sort` | string | no | `newest` · `cheapest` · `most_expensive` |
| `page` | number | no | 1-based page number (default 1, max 10) |
| `limit` | number | no | Default 10, max 24 |
| `only_photo` | boolean | no | Only ads with at least one photo |
| `only_video` | boolean | no | Filters the **fetched page** - Divar's API has no server-side video filter |
| `exchange` | string | no | `only_exchanges` = swap-only · `exclude_exchanges` = hide swaps |
| `seller_type` | string | no | `personal` = private seller · `marketplace` = shop |
| `brand_model` | string | no | Exact model, resolved from Divar's own list. Cars + phones only. Unknown text falls back to plain text search |
| `min_mileage_km` / `max_mileage_km` | number | no | Car mileage range in km. Cars only |
| `condition` | string | no | Phones: `new` · `used` (`*_exact` for strict match) |
| `storage_gb` | number | no | Phones: storage in GB (`storage_gb_exact` for strict match) |
| `ram_gb` | number | no | Phones: RAM in GB (`ram_gb_exact` for strict match) |
| `sim_count` | number | no | Phones: `1` · `2` (`sim_count_exact` for strict match) |
| `installment` | boolean | no | Phones: installment sale (`installment_exact` for strict match) |
| `min_area` / `max_area` | number | no | Apartment rent: size in sqm |
| `rooms` | string | no | Apartment rent: Persian count, e.g. `دو`, `سه` |
| `min_deposit_toman` / `max_deposit_toman` | number | no | Apartment rent: deposit (rahn) in Toman |
| `min_rent_toman` / `max_rent_toman` | number | no | Apartment rent: monthly rent in Toman |
| `parking` / `elevator` / `store` / `balcony` | boolean | no | Apartment rent amenities |
| `business_type` | string | no | Apartment rent: `personal` · `real-estate-agent` |

Deliberately absent (probe-tested, do nothing on the API): urgent-only, shop-only search, car production year, server-side video-only. Fuzzy phone values are expanded client-side (`*_exact` pins them down).

Budget questions (`"best X under Y"`) belong to **`find_best_value`**, not here - plain search only walks the pages you ask for.

## `ad_details`

**Everything about one ad**: price, description, specs, photos, tags, map - **never a phone number**.

| Param | Type | Required | Notes |
|---|---|---|---|
| `token` | string | **yes** | The ad token from a card |

## `get_ads_batch`

Shortlist cards for **up to 10 tokens** - feeds `compare_ads`. Dead tokens are reported in `missing_tokens`, not failed.

| Param | Type | Required | Notes |
|---|---|---|---|
| `tokens` | string[] | **yes** | 1 to 10 ad tokens |

## `compare_ads`

**2-5 ads side by side**: price spread plus **only the specs that actually differ** (identical rows are dropped).

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
| `category` | string | no | Slug to narrow the hunt |
| `limit` | number | no | How many picks (default 3, max 10) |

For cars and homes: compare the specs yourself - prices are negotiable and ads sell fast.
