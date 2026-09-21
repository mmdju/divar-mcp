# Tool reference

Input/output reference for all **7 tools**. Types only - no internals. For conversation flows, see [examples/sample-calls.md](../examples/sample-calls.md).

Every tool is **read-only** and needs **no credentials**. Result lists are **capped** (default 10, max 30). All prices are in **Toman** (`price_toman: null` means negotiable - never 0).

Which tool for what - the short version:

| The user says | Call |
|---|---|
| something vague, or a town/category you are not sure about | `divar_suggest` |
| "show me X", "X in Y under Z", "what is there?" | `search_ads` |
| "is this the same as that one?" (a specific ad) | `ad_details` |
| a list of tokens, or "compare these" | `get_ads_batch` then `compare_ads` |
| "best X under Y", "cheapest X" | `find_best_value` |
| "is this a fair price?", "is this expensive?" | `market_price` |

Shared conventions:

- `limit` - how many items to return (default 10, max 30).
- `page` - 1-based page number, max 50. Page 2+ walks real pages (pagination continuation is handled server-side), so deeper pages cost extra requests - and one call walks at most 5 **new** pages, skipping the ones it already has in cache. A short walk is reported as `page_requested` / `page_returned` / `page_note`; call again to continue from where it stopped. `has_next_page` always reflects the last page Divar actually served.
- `pages` - the "show me more of this search" mode: scan and merge up to 5 pages in one call (deduplicated by token, same per-call fetch budget as `page`). `candidates` says how many distinct ads the answer was chosen from.
- `city` - English name (`tehran`, `mashhad`), Persian name or numeric id. `cities` takes up to 5 at once.
- `category` - Divar slug, e.g. `light` (cars), `mobile-phones`, `apartment-rent`, `apartment-sell`. All **237** Divar categories are addressable; ask `divar_suggest` when unsure. A slug that is not a real category is **refused with the nearest real ones** (`filters_not_applied` + `category_note`) instead of quietly searching everything - Divar itself ignores an unknown slug and returns the unfiltered list, which would look like an answer.
- Cities work the same way for all **1177** of them: a number that is not a city id is refused like a bad name, and if Divar answers a city with a wider area the response says so (`city_applied: false`).

## `divar_suggest`

Vague wording to **real search terms, category slugs, city ids**. Call first when the wording is colloquial or when you need a `category` slug.

| Param | Type | Required | Notes |
|---|---|---|---|
| `query` | string | **yes** | What the user typed, e.g. `پراید`, `two-bedroom` |
| `city` | string | no | City name or id. Default `tehran` |

Returns: `categories` (slug + title + hint), `cities` (name + id), `districts` for the city, `guessed_category` (the leaf your wording most likely means - buy vs rent vs cars vs phones), and `category_filters` (per-leaf allow-list: the only extra keys `search_ads` accepts for that category).

## `search_ads`

Search ads, get **compact cards**: price in Toman (plus the deposit on a rental), district, badges, photo/video flags, ad URL.

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
| `sort` | string | `newest` · `cheapest` · `most_expensive`. **Needs a `category`** - Divar only orders by price inside one. A sort that cannot be applied comes back in `filters_not_applied` with `sort_note`, never as unordered results presented as sorted (and the `apartment-rent` leaf has no price sort upstream at all) |
| `exchange` | string | `only_exchanges` = swap-only · `exclude_exchanges` = hide swaps. **Needs a `category` that has an exchange filter** (goods, electronics, cars - real estate does not); otherwise it is named in `filters_not_applied` with `exchange_note` |
| `seller_type` | string | `personal` · `shop` (goods; sent as `marketplace`) · `real-estate-business` (property). Cars accept **`personal` only** - a `shop` request there comes back in `filters_not_applied` with `seller_type_note` instead of a page that quietly ignored it |
| `only_photo` | boolean | Only ads with at least one photo |
| `only_video` | boolean | Filters the **fetched page** - Divar's API has no server-side video filter |
| `page` | number | 1-based (default 1, max 50) |
| `pages` | number | Scan and merge this many pages of 24 into one answer (default 1, max 5). Use it instead of repeating `page+1` calls; the union is deduplicated by token and the response reports `pages_requested` / `pages_returned` / `candidates`. Mutually exclusive with `page` above 1 |
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

**Reading a rent list.** A rent row carries two numbers and the card keeps both: `price_toman` is the monthly rent (the figure Divar shows as the price) and **`deposit_toman`** (ودیعه) sits beside it. Each line has its **own** honesty flag - `price_is_placeholder` / `price_note` for the rent, `deposit_is_placeholder` / `deposit_note` for the deposit - because the two arrive as independent fields: an honest rent can sit beside a typed `۱,۰۰۰` deposit, and the flag for one never speaks for the other. A deposit is only ever flagged **by shape** (at or under 1,000 Toman, a repeated digit, an int-limit number): a small deposit beside a big rent is a real product on Divar (ودیعه کم، اجاره بالا), not a broken number, and there is no deposit median to judge one against. Both honesty flags appear **only when they fire** - absent means "that line is fine" / "the title does not say so" - because measured live over 358 rent ads the deposit flag fired on 2 and the room-share flag on 56, so an always-present pair would be two dead keys on every card in every list. Separately, an ad whose **own title** says it is a room in a shared home (`همخونه` / `هماتاقی` / `اجاره اتاق` / `اتاق از واحد` / `اتاق مجرد`) carries **`shared_housing`** + `shared_housing_note`, and a rent list counts them in `shared_housing_ads` + `shared_housing_note` (a count of the ads the call **scanned**, not only of the page it returned - with `pages` above 1 those are different sets): they are real listings and stay in the list, but their number is a room's price rather than a flat's rent - `market_price` is what keeps them out of a median. The flag follows the wording, so a room share that does not say so in its title looks like any other cheap ad.

Deliberately absent (probe-tested, do nothing on the API): urgent-only, shop-only search, car production year, server-side video-only, recent-only (`recent_ads` is advertised by Divar's own filter endpoint but returns an identical page - see `scripts/probe-filters.mjs` in the private repo).

Also absent because it is **not reachable without login**: listing a single store's ads. `divar.ir/pro/<ref>` is a logged-in surface - the data endpoint answers `403 RBAC` anonymously, and no search filter accepts a business ref.

Budget questions (`"best X under Y"`) belong to **`find_best_value`**, not here - plain search only walks the pages you ask for.

## `ad_details`

**Everything about one ad**: price, description, specs, photos, tags, map - **never a phone number**.

The price comes from the ad's own spec rows (`قیمت پایه` for cars, `قیمت` for phones, `اجارهٔ ماهانه` for rentals) - the place Divar actually publishes it - and **`price_source`** names which source was used (`jsonld` or ``list row 'قیمت پایه'``). A deposit (`ودیعه`) is never treated as a price: a full-mortgage rental (`رهن کامل`) returns `price_toman: null` rather than a wrong number, and a rental that does have both lines reports them separately (`deposit_toman`, `monthly_rent_toman`) - with the deposit's own honesty flag when that line is itself a placeholder (`deposit_is_placeholder` + `deposit_note`, both absent unless they fire), since the rent and the deposit are two independent fields. An ad whose title says it is a room in a shared home carries `shared_housing` + `shared_housing_note` on this lane too.

`specs` is the whole spec table, not a sample: mileage, production year and colour on a car; size, year built and rooms on a home; the price row itself. `amenities` holds the amenity rows the ad says it **has** (پارکینگ / انباری / آسانسور) and `amenities_absent` the ones it says it does **not** ("آسانسور ندارد", "بدون انباری") - Divar writes both in the same row, so they are split rather than mixed. `condition_scores` carries Divar's own condition assessment of a vehicle (موتور / وضعیت شاسی‌ها / بدنه / گیربکس). Alongside them: the Latin district slug, the Persian category name, the canonical `brand_model`, and a `thumbnail` taken from the first carousel image.

The details lane returns **no** `badges`, `has_video` or `time_ago`: those exist only on search rows, and reporting them as `[]` / `false` here would look like something that was checked.

It also answers **whether the ad is still worth chasing**, from the payload the server already fetched:

- **`expires_at`** - when Divar takes the ad down (`seo.unavailable_after`). `null` when Divar does not say, never invented.
- **`chat_enabled`** - whether the seller can be messaged at all. An ad nobody can reply to is a different proposition from one that looks identical otherwise. (`has_chat` on this lane carries the same value, read from the same field, so the two can never disagree - the payload's row-level flag means nothing here.)
- **`seller_type`** / **`business_token`** - `personal`, or the store type (`marketplace`, `premium-panel`, …) with its brand token. `business_token` is `null` for a private seller - not an empty string. These are **output labels as Divar writes them**, which is not the same list the search filter accepts: a real-estate agency answers `premium-panel` here while the filter for the same leaves takes `personal` or `real-estate-business`. The token is what makes a business identity checkable instead of a label to guess at.

`contact_uuid`, which the payload does carry, is deliberately **never** returned.

| Param | Type | Required | Notes |
|---|---|---|---|
| `token` | string | **yes** | The ad token from a card |
| `detail` | string | no | `compact` = decision facts only (title, price and - for a rental - the deposit with its own honesty flag, city, `expires_at`, `has_chat`, `seller_type` + `business_token`, `shared_housing` when the title says so, url); `full` = everything (default) |

## `get_ads_batch`

Shortlist cards for **up to 10 tokens** - feeds `compare_ads`. Each card carries price, specs and the facts that decide whether the ad is still chaseable (`expires_at`, `chat_enabled`, `seller_type` + `business_token`), because those ride the payload the call already fetched - plus, for a rental, **`deposit_toman`** with its own `deposit_is_placeholder` / `deposit_note`, and **`shared_housing`** + `shared_housing_note` when the ad's title says it is a room in a shared home. Both flags ride **only when they fire**: absent means real, or a whole unit. A shortlist of rentals without the deposit (and without the room-share flag) is not a shortlist you can decide from. Repeated tokens are fetched once. A dead token (sold/removed) lands in `missing_tokens`; a token that is not even shaped like a Divar ad token lands in `invalid_tokens` (that one is the caller's typo - copy it again, retrying it cannot help); a token that could not be fetched because Divar was throttling lands in `partial_failures` with the real reason - a throttle is never reported as a sold ad. A call whose tokens are all malformed fails as a usage error.

| Param | Type | Required | Notes |
|---|---|---|---|
| `tokens` | string[] | **yes** | 1 to 10 ad tokens |

## `compare_ads`

**2-5 ads side by side**: price spread plus **only the specs that actually differ** (identical rows are dropped). Same split as `get_ads_batch`: `missing_tokens` for ads that are gone, `invalid_tokens` for tokens that are not Divar ad tokens at all, `partial_failures` for ads blocked by a throttle - a typo is never blamed on Divar. If fewer than two ads resolve, the error names which token was which.

Beyond the specs, each ad carries `expires_at`, `chat_enabled`, `seller_type`, `business_token`, the rental pair `deposit_toman` + `deposit_is_placeholder` / `deposit_note`, the room-share flag `shared_housing` + `shared_housing_note` (the two flags ride only when they fire) and **`vs_set_median_percent`**, and the response carries **`set_median_toman`** (the middle of *these* ads), `price_spread_percent` (how far the priciest sits above the cheapest) and `cheapest_token` / `priciest_token`. The median of two to five ads is the middle of that shortlist, **not a market price** - `set_median_note` says so, and `market_price` is the tool that answers the market question. An ad whose price field is a placeholder (`۱,۰۰۰ تومان` and friends) is compared on its specs like any other and comes back flagged, but it cannot drag that median: the middle is taken over the honestly priced ads whenever at least two remain (the response lists them in `placeholder_price_tokens`), and its own `vs_set_median_percent` is `null` rather than a confident "100% below".

| Param | Type | Required | Notes |
|---|---|---|---|
| `tokens` | string[] | **yes** | 2 to 5 ad tokens |

## `market_price`

**"Is this price normal?"** Takes one ad (`token`) or a market (`category`), fetches live comparables and answers with arithmetic you can redo by hand: the **median**, the quartiles, the ad's **percentile** (how many comparables were cheaper) and a plain verdict - `below_median` / `around_median` / `above_median` (the band is ±10% of the median).

What it does with the sample, and why:

- **Comparables** are the same category, the same city (or cities), optionally the same `brand_model`, matched by an explicit `query` or - when pricing a token - by **the ad's own title** first. If the title matches fewer than 8 priced ads, the sample widens to the whole category and says so (`comparison_term_widened` + `comparison_term_note`).
- **Placeholder prices are kept out of the maths and shown in the answer.** A price field holding `۱,۰۰۰ تومان` is how a seller says "call me and ask" (نقد و اقساط / تماس بگیرید), and the whole cheapest page of a car or phone search is made of those ads. They are listed in **`sample_ads_placeholder_prices`** with their own `price_is_placeholder` / `price_note`, and counted in `placeholder_prices_excluded` - the count genuinely left out of the median and quartiles. The cut is relative, never a magic number: anything under 5% of the sample median (a car listed at 1 Toman is a broken listing, not a bargain, and so is a 10,000-Toman phone beside a 320,000,000-Toman median). Ads with no number at all are kept out of the maths and counted honestly: `negotiable_ads_excluded` is توافقی ads, and `unpriced_ads_excluded` is everything unpriced for another reason ("رهن کامل", "call us").
- **A rent median is the median of whole units.** A room share (`همخونه` / `هماتاقی` / `اجاره اتاق` / `اتاق از واحد` / `اتاق مجرد`, read from the ad's **own title**) is a real listing, but its number is a room's price rather than a flat's rent, so when the sample still holds five whole units with an asking price those ads are kept out of the median, the quartiles and the cheapest ads - `shared_housing_excluded` is how many - and every one of them is still shown in **`sample_ads_shared_housing`** with its own note. Measured live 2026-09-21: 5 of 30 ads in a low-deposit Tehran rent search were room shares, and leaving them in moved the median rent from 14,000,000 to 16,500,000 Toman (17.9%) - the difference between "around the market" and "over it" for an honest flat; in an "اتاق مبله" search 8 of 28 were room shares and they moved the median by 120%. With fewer than five whole units with an asking price left they stay in the maths and `shared_housing_note` says the median mixes rooms and flats - and when **no** whole unit's price is in the median at all the note says exactly that (`no whole unit's price is in the median above at all, so that median is the median of room shares - read it as the price of a room, not as the rent of a flat`), so a room-search market is never read as a market of flats. A typed `۱,۰۰۰ تومان` in a whole unit's price field is not an asking price either: those are the ads the placeholder cut removes, so they never count toward the five.
- **Fewer than 8 comparables is not a benchmark**: `enough_comparables: false` plus `thin_sample_note`, and the numbers are still returned so you can see how thin.
- It reports **`priced_ads`** (the sample size), the four quartile numbers (`min_toman`, `p25_toman`, `median_toman`, `p75_toman`, `max_toman`) and up to 3 cheapest plus 3 nearest-the-median ads with their URLs.
- When you price a **token** and that ad states no number at all - a full-mortgage rental (رهن کامل) lists only a deposit - `comparison` says exactly that (`position: "unknown"`) instead of leaving the answer without a verdict, and the deposit is named as a deposit rather than compared as a price.
- **`not_an_appraisal`** states in every response that this is the median of the ads that call fetched - not Divar's کارنامه appraisal - and that model year, mileage, size and condition still differ between ads, so the URLs are worth opening. For rent categories `metric_note` says the compared number is the **monthly rent** (اجارهٔ ماهانه) - the figure Divar shows as the price - and that the deposit (ودیعه) is a separate line, so two rentals with equal rent and very different deposits rank as equals here; it also states that the room shares flagged from the ad's own title are left out of it whenever five whole units with an asking price remain.

| Param | Type | Required | Notes |
|---|---|---|---|
| `token` | string | no | The ad to price. Its own category, city and title seed the comparison |
| `category` | string | no | Required when there is no `token` |
| `city` | string | no | Defaults to the ad's own city, else `tehran` |
| `cities` | string[] | no | Up to 5 cities to sample from |
| `query` | string | no | Explicit comparison term, e.g. `pride 131`. Overrides the ad's own title |
| `brand_model` | string | no | Cars/phones: exact model to compare against. On any other category it is reported in `brand_model_not_applied` rather than guessed |
| `max_sample` | number | no | Priced comparables to collect (default 48, max 96) - more sample means more upstream pages |

## `find_best_value`

**"Best X under Y Toman"**. Walks up to 3 search pages until the budget is exhausted, keeps what fits, then **orders the picks by what the budget actually reaches** - the strongest honest asking price first, with asks within 10% of each other counted as equally reachable (that band is taken from the market's own median, never from your round number). Inside a band the chaseable listing wins - photos, chat, a private seller - so a one-photo store ad parked at your cap does not lead an answer it cannot honour. `cheapest_toman` is the floor of that same pool and `picks_note` says so, so the cheap end is never further away than one field. One extra page of the same search without the price cap is fetched as a price scale (see `market_scale` below) - that is the only request beyond the walk.

| Param | Type | Required | Notes |
|---|---|---|---|
| `query` | string | **yes** | E.g. `پراید`, `two-bedroom apartment` |
| `budget_toman` | number | **yes** | Maximum price in Toman (not Rial) |
| `city` | string | no | Default `tehran` |
| `cities` | string[] | no | Up to 5 cities at once, names or ids |
| `category` | string | no | Slug to narrow the hunt |
| `limit` | number | no | How many picks (default 3, max 10) |
| `include_negotiable` | boolean | no | Also surface "توافقی" ads: they rank **last** with `price_toman: null` and a why line that says ask the seller (default false) |

Placeholder prices are **labelled, ranked last, and never hidden**: a listing at 1,000 Toman is a real ad by a shop that wants you to call (نقد و اقساط), so it stays in the answer - it just does not get ahead of an honest asking price. Honest asking prices always come first and `cheapest_toman` can only ever be a real ask. The cut is **relative, never a magic number**: shapes that need no sample (at or under 1,000 Toman, a repeated digit, an int-limit number) are certain on their own, and the subtle ones are flagged against the median of the same search *without* the price cap. Either way the card carries `price_is_placeholder` / `price_placeholder_kind` / `price_note`, and the response summarises them in `placeholder_price_ads` + `placeholder_price_note`.

That uncapped page rides in every answer as **`market_scale`** (`priced_ads`, `min_toman`, `median_toman`, `max_toman`): a pool that already fits your budget cannot judge itself, and a budget hunt that reaches nothing real is exactly when "what does this actually cost?" is the useful answer. So a 1,000,000-Toman hunt for a car returns those 24 ads **labelled** - not an empty list - with `honestly_priced_in_budget: 0`, `cheapest_toman: null` and a `budget_note`: *"Nothing fitting 1,000,000 Toman carries an honest asking price - the 24 ad(s) this budget reaches are real listings with placeholder numbers in the price field (بپرس / نقد و اقساط). This query actually costs from 160,000,000 Toman (median 566,500,000) - budget toward that, or call the sellers below."*

The response also carries `in_budget` (how many ads fit the budget) and `honestly_priced_in_budget` (how many of those state a real asking price), and `picks` is present even when it is empty.

A `category` that is not a real Divar leaf is refused with a usage error naming `divar_suggest` (`cars` and `vehicles` fold to the filter-capable `light` leaf automatically) - it used to come back as an upstream "rephrase your query".

For cars and homes: compare the specs yourself - prices are negotiable and ads sell fast.

## Prompts (request templates)

Two ready-made flows a client can offer as slash-commands - the server renders them into a steer message for the agent:

| Prompt | Arguments | Renders into |
|---|---|---|
| `compare-ads` | `tokens` (comma-separated, required) | get_ads_batch → compare_ads, with a report of the price spread and real differences |
| `best-under-budget` | `thing`, `budget` (required), `city` (optional) | divar_suggest → find_best_value, shortlist of URLs at the end |

## Resources (read-only reference data)

Static tables the server can serve on demand - `divar://` URIs, JSON:

- **`divar://cities`** - every searchable city, in three shapes: `by_id` (id → Latin slug), `by_slug` (slug → id) and `by_name_fa` (Persian name → id)
- **`divar://cities-fa`** - the same data, Persian name → city id only
- **`divar://categories`** - the whole category tree: slug → `{ name, parent, depth }`
- **`divar://category-filters`** - which filter keys each category accepts (sending unknown keys is a 400)
- **`divar://category-filters/{slug}`** - the same for one category, e.g. `divar://category-filters/apartment-rent`
