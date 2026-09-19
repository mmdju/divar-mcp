# Changelog

Releases of the **hosted service** (`https://divar-mcp.mmdju.workers.dev/mcp`). Dates are UTC.

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
