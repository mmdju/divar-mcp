# Changelog

Releases of the **hosted service** (`https://divar-mcp.mmdju.workers.dev/mcp`). Dates are UTC.

## 0.5.0 - 2026-09-20

_Prepared, not deployed: the hosted worker still answers as 0.4.0, so [scripts/verify-live.mjs](scripts/verify-live.mjs) reports the mismatch until this release is pushed. Every claim below is in the source, none of it is live yet._

- **Every Divar category and city is addressable now, not a hand-typed subset.** The server knew 27 category slugs and 36 big cities, so four of Divar's ten verticals (services, personal, community, industrial equipment) had no reachable market and any smaller town was refused outright. It now carries Divar's real taxonomy - **237 categories across 11 roots and 1177 cities** - vendored into the build from Divar's own keyless endpoints. Nothing new to configure, no key, same URL.
- **A wrong category can no longer look like an answer.** Divar ignores an unrecognized slug and returns the *unfiltered* list, so a typo used to produce a full page of results that answered a question nobody asked. Unknown categories are now refused with the nearest real leaves (`category_note`), and an ambiguous word - "آپارتمان" is both rent and sell - is reported as ambiguous rather than guessed. Bad city ids are refused the same way, and if Divar widens a city behind your back the response says `city_applied: false` instead of pretending the area was filtered.
- **`market_price`: "is this price normal?"** Give it an ad token (its own category, city and title seed the comparison) or a category, and it fetches live comparables and answers with a median, quartiles, the ad's percentile and a plain verdict. It says how many ads it compared, drops placeholder prices (anything under 5% of the sample median), keeps negotiable ads out of the maths, declares a sample under 8 ads as too thin to be a benchmark, and states in every response that it is **not Divar's کارنامه appraisal**. For rentals it tells you the median is a **deposit** (ودیعه) median.
- **The price is finally read from where Divar actually puts it.** `ad_details` used to take the price from a structured `jsonld` block that live payloads no longer carry, so `price_toman` came back `null` for essentially every ad fetched from the real API - and `compare_ads` had nothing to compare. The price lives in the ad's own spec rows (`قیمت پایه` for cars, `قیمت` for phones, `اجارهٔ ماهانه` for rentals) and is now read from there, with `price_source` reporting which source it came from. A deposit (`ودیعه`) is deliberately **not** treated as a price, so a full-mortgage rental reports no price instead of a wrong one.
- **`ad_details` answers whether the ad is still worth chasing.** Three facts the payload always carried are now returned: `expires_at` (when Divar takes it down), `chat_enabled` (whether the seller can be messaged at all), and `seller_type` / `business_token` (private seller, or store with its brand). No extra request, and `contact_uuid` still never leaves the server.
- **`compare_ads` names the middle of its own set.** Each ad now carries `vs_set_median_percent` and the response carries `set_median_toman`, `price_spread_percent`, `cheapest_token` and `priciest_token` - with a note saying the median of two to five ads is the middle of that shortlist, not a market price.
- **The text an agent reads before it chooses a tool is now accurate.** The server's own instructions still claimed no sorting existed (it shipped months ago) and never mentioned `market_price`; `divar_suggest` advertised 36 cities. Every tool now says which sibling to hand off to - budget questions to `find_best_value`, "is this price normal?" to `market_price`, several ads to `get_ads_batch`, 2-5 ads to `compare_ads` - and a test keeps the whole surface honest.
- **Two things that are not possible in a read-only server are now documented instead of guessed at**: listing a single store's ads (the endpoint answers `403 RBAC` without a login) and per-district ad counts on the map. The filter endpoint that Divar's own search page calls is now used as an oracle in the probes, and it is how `recent_ads` was found to be advertised but **fake** (it returns an identical page), so it stays unsent.

## 0.4.1 - 2026-09-20

_Prepared, not deployed: the hosted worker still answers as 0.4.0, so [scripts/verify-live.mjs](scripts/verify-live.mjs) reports the version mismatch until this release is pushed. Every claim below is in the source, none of it is live yet._

- **A mistyped token is no longer blamed on Divar.** A token that cannot be a Divar ad token at all (say `"xy"`) was filed with the throttled ones, so the answer read "some tokens could not be fetched right now (Divar throttling or network) - retry the failed tokens in a moment". Divar was never at fault, and retrying that exact text can never work. Malformed tokens now come back in `invalid_tokens` with a note that says to copy the token again, a call whose tokens are *all* malformed fails as a usage error instead of returning an empty page that hints at the network, and `partial_failures` is left to mean what it says: something on Divar's side went wrong.

## 0.4.0 - 2026-09-20

_Deployed 2026-09-20, worker version `c995f129`. [scripts/verify-live.mjs](scripts/verify-live.mjs) passes 20/20 against the live endpoint and the deeper remote check 23/23, with every tool schema identical to the source build._

- **A throttled ad is no longer called a sold ad.** `get_ads_batch` and `compare_ads` used to report every failure as "sold or removed", so a Divar throttle accused a live ad. Ads that are genuinely gone now come back in `missing_tokens`; anything that could not be fetched comes back in `partial_failures` with the real reason, and an all-throttled call fails with the throttle message instead of an empty list.
- **The seller filter on cars stops pretending.** Cars accept `personal` (and nothing else) upstream, so `seller_type: "shop"` on a car search used to be dropped silently. It now really applies `personal`, and a store request comes back with `filters_not_applied` + `seller_type_note` explaining that the car leaf has no store option.
- **`ad_details` reports the real district and city.** `district` was always `null` and `city` was read from the breadcrumb - which holds category names, so a car ad's city was reported as "خودرو". Both now come from the ad's own `seo.web_info` block.
- **Deep pages are bounded and honest.** Divar needs each page's continuation data, so page N meant walking 1..N; `page: 50` meant 49 upstream requests (~40s). A call now walks at most 5 pages it has to fetch (cached pages are free), reports `page_requested` / `page_returned` / `page_note` when it stops short, and a repeated call continues from the cache instead of restarting.
- **One call never waits out a throttle for 40s.** A 429 on the details lane slept a fixed 10s and retried 4 times; a call now sleeps at most 12s in total on throttles and then returns the message.
- **Rate limiting moved into the code** as well as the edge rule (see [SECURITY.md](SECURITY.md)): per-IP, 60 requests a minute on `POST /mcp`, `429` + `retry-after`.
- `find_best_value` accepts `cities` (it was always read, just never declared), repeated tokens are fetched once, and `marketplace` is documented as the upstream name for `shop`.
- **The version the service runs is now checkable.** `/health` reports it, and [scripts/verify-live.mjs](scripts/verify-live.mjs) compares it with the newest release in this file - along with the documented `prompts` and `divar://` resources. A deployment that lags these docs is now visible from outside instead of passing quietly.

## 0.3.1 - 2026-09-19

- Fixed: `divar_suggest` returned `guessed_category: null` for Persian wordings built on an alef-madda, e.g. `خرید آپارتمان` or `آیفون`. The query is folded (آ → ا) before matching, but the guess patterns still carried the مadda form, so `آپارتمان`/`آیفون` never matched. Buy (`خرید`/`فروش` + home word) now resolves to the right `-sell` leaf, and the rent/phone guesses are restored.

## 0.3.0 - 2026-09-19

- Home **BUY** filters: `apartment-sell`, `house-villa-sell`, `residential-sell`, `commercial-sell`, `office-sell`, `shop-sell` and `plot-old` now accept verified `size` / `rooms` / `parking` / `elevator` / `warehouse` / `balcony` filters, each gated by a per-leaf allow-list (probe-tested with an HTTP-status + token-overlap diff against the live API). `-sale` slugs fold to their `-sell` leaf.
- `seller_type` is now allow-list driven: `personal`/`shop` route to the goods seller filter, `real-estate-business` to the property one - so it works across goods and real-estate leaves instead of only `apartment-rent`.
- `divar_suggest` exposes the sell leaves and guesses buy vs rent from the wording (`guessed_category`).
- Docs/schema reference corrected to the live param names (`min/max_size_sqm`, `min/max_credit_toman`, `warehouse`, `sim_slots`, `min/max_storage_gb`, `min/max_ram_gb`, four-value `condition`).

## 0.2.1 - 2026-09-18

- New verified filters: **`sort`** (`newest` · `cheapest` · `most_expensive`), **`exchange`** (`only_exchanges` · `exclude_exchanges`), **`seller_type`** (`personal` · `marketplace`), **car mileage** (`min/max_mileage_km`, range `1000-100000`), **phone specs** (`condition` · `storage_gb` · `ram_gb` · `sim_count` · `installment`) with exact-value (`*_exact`) variants.
- `brand_model` lookup from Divar's own model list (cars + phones, 24h cache).
- Fixed: page 2+ of `search_ads` carried no pagination continuation and upstream repeated page 1 - now walks real pages.
- Deliberately left out (probe-tested, do nothing on the API): urgent-only, shop-only, car production year, fake `usage` variants.

## 0.2.0 - 2026-09-17

- `brand_model` filter for cars and phones, resolved from Kenar assets.
- Category tree from Kenar (238 categories), `cars`/`vehicles` alias to the filter-capable `light` leaf.
- Removed fake `usage`/`production_year`/`mileage`/`year` keys after value-level probes.
- English-only agent-facing output (cities, categories, badges).

## 0.1.0 - 2026-09-16

- First release: **6 tools** - suggest, search, details, batch, compare, best value.
- Read-only, no login, no phone numbers. Persian handling: yeh/kaf folding, Persian digits, compound-word retry.
- Compact cards to protect agent context.
