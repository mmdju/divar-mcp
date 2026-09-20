# Divar MCP - Classifieds intelligence for AI agents

A public MCP server that gives AI agents **real Divar knowledge**: search **Iran's largest classifieds**, **prices in Toman**, categories, cities, car models, phone specs, rental filters, ad details and comparisons. **Read-only, no key needed. No login, no phone numbers - ever.**

**Live endpoint:** `https://divar-mcp.mmdju.workers.dev/mcp` (Streamable HTTP, stateless)

**[نسخه فارسی](README_FA.md)** · **[Examples](examples/sample-calls.md)** · **[Tool reference](docs/tools.md)** · **[Changelog](CHANGELOG.md)**

## Connect in 30 seconds

Any MCP client, **one URL**. Cline / Cursor / Claude Desktop (`mcp.json` style):

```json
{
  "mcpServers": {
    "divar": { "url": "https://divar-mcp.mmdju.workers.dev/mcp" }
  }
}
```

Then just talk: **"pride under 300 million"**, **"two-bedroom to rent in Tehran"**, **"is this 207 a good deal?"**, **"cheapest iPhone 13 in Mashhad"**.

## 6 tools

| Tool | What it answers |
|---|---|
| `divar_suggest` | Vague wording to **real search terms, category slugs, city ids** |
| `search_ads` | "Show me X", price checks, **filters + sorting + paging** |
| `ad_details` | Everything about one ad: **price, specs, photos, map - no phone** |
| `get_ads_batch` | Shortlist cards for **up to 10 tokens** - feeds `compare_ads` |
| `compare_ads` | "Which of these?" - **only the specs that actually differ** |
| `find_best_value` | "Best X under Y Toman" - **ranked picks, cheapest first** |

Notes for agent builders:

- **All prices are in Toman** (1 Toman = 10 Rial). Ads marked negotiable return `price_toman: null` - never 0. Prices move and ads sell fast - always link the ad URL so the user can confirm before acting.
- Start vague queries with **`divar_suggest`** to get real search terms, a `category` slug and a city id.
- Anything with a **budget** or the word **"best"** goes to **`find_best_value`** - plain search only walks the pages you ask for.
- Sorting is real: **`newest` · `cheapest` · `most_expensive`**. Pass `sort: cheapest` with a budget to see the global cheapest.
- **Negotiable ads are not hidden lies**: by default `find_best_value` ranks priced ads only; pass `include_negotiable: true` to surface "توافقی" picks - they come last with `price_toman: null` and a "ask the seller" note. `ad_details` also accepts `detail: "compact"` for a cheap decision card when scanning many ads.
- Homes add **real filters** for both **rent** (`apartment-rent`) and **buy** (`apartment-sell`, `house-villa-sell`, `office-sell`, `shop-sell`, `plot-old`…): size (sqm), rooms, deposit (rahn) + monthly rent for rentals, and parking / elevator / warehouse / balcony. Each buy leaf honors a verified subset. Cars and phones add **`brand_model`** resolved from Divar's own model list.
- Some Divar UI filters do **nothing on the API** (urgent-only, shop-only, car year) - they were probe-tested and left out on purpose rather than faked. See **[docs/tools.md](docs/tools.md)** for what is real.
- Results are **capped** (default 10, max 30) to protect agent context. Persian queries are normalized (yeh/kaf folding, Persian digits, ZWNJ variants).
- See **[examples/sample-calls.md](examples/sample-calls.md)** for seven copy-paste conversation flows, and **[docs/tools.md](docs/tools.md)** for the full parameter reference.
- The server also speaks MCP **prompts** (`compare-ads`, `best-under-budget` slash-command templates) and **resources** (`divar://cities`, `divar://category-filters/{slug}`) - reference data without burning a tool call.

## What it feels like

Three real flows (full copy-paste versions in [examples/sample-calls.md](examples/sample-calls.md)):

**1. Best under budget.** You type (in Persian):

```
پراید زیر ۳۰۰ میلیون چیه؟
```

Agent calls `find_best_value` (`query` + `budget_toman`). You get 2-3 ranked picks with price, district, photo count, ad URL and a one-line why each. Plain search only walks the pages you ask for — best-value walks up to 3 pages until the budget is exhausted.

**2. Rental with real filters.** You type (in Persian):

```
خونه دوخوابه اجاره تو تهران می‌خوام.
```

Agent calls `search_ads` (`category: apartment-rent`, `rooms`, `min_size_sqm`). You get deposit (rahn), monthly rent, size, rooms, district and URL.

**3. Which one?** You type (in Persian):

```
بین این دو تا ۲۰۷ کدوم؟ `abc123` یا `def456`؟
```

Agent calls `compare_ads`. You get price spread plus only the specs that actually differ — identical rows are dropped.

## Filters at a glance

Condensed from [docs/tools.md](docs/tools.md) — the full parameter table lives there.

**Basics:** `query`, `category` (`light`, `mobile-phones`, `apartment-rent`…), `city` or `cities` (up to 5), `districts`, `min/max_price_toman`, `sort` (`newest` · `cheapest` · `most_expensive`), `page` (1-based, max 50, walks real pages - up to 5 new ones per call, and it tells you when it stopped short), `limit` (default 10, max 30), `only_photo`, `only_video` (page-level — the API has no server-side video filter).

**Cars:** `brand_model` (exact model, resolved from Divar's own list — e.g. Peugeot 206), `min/max_mileage_km`.

**Phones:** `brand_model`, `condition` (`new` · `like-new` · `used` · `repair-needed`), `min/max_storage_gb`, `min/max_ram_gb`, `color`, `sim_slots` (`1` · `2` · `3+`), `installment`.

**Homes (rent + buy):** `min/max_size_sqm`, `rooms` (Persian count array, e.g. `["سه"]`), `parking`, `elevator`, `warehouse`, `balcony`. Rent leaves (`apartment-rent`) also take `min/max_credit_toman` (deposit) and `min/max_rent_toman`. Buy leaves: `apartment-sell`, `house-villa-sell`, `residential-sell`, `commercial-sell`, `office-sell`, `shop-sell`, `plot-old` — each honors a verified subset (`-sale` slugs fold to `-sell`).

**Deal type:** `exchange` (`only_exchanges` · `exclude_exchanges`), `seller_type` (`personal` · `shop` · `real-estate-business`). Real-estate leaves take `personal` / `real-estate-business`, goods take `personal` / `shop`, and cars take **`personal` only** - a store request there is reported in `filters_not_applied`, never quietly ignored.

> **Deliberately absent:** urgent-only, shop-only search, car production year, server-side video-only. Probe-tested — they do nothing on the API, so they stay out rather than faked.

## How it works

`AI agent → POST /mcp (no key) → stateless worker → Divar public web API → small cards back (Toman, district, URL).` No sessions, no accounts, no database — only a short-lived response cache. Details calls are paced (2s + backoff). Full diagram in [docs/architecture.md](docs/architecture.md).

## Trust, verified

Don't take my word for it - check the live server yourself:

```bash
node scripts/verify-live.mjs   # needs Node.js 18+, nothing to install
```

It lists all 6 tools over Streamable HTTP, runs a search + details read + privacy check + error paths, and asserts the honest-data contract. The same script runs **hourly in CI** ([![Live verify](https://github.com/mmdju/divar-mcp/actions/workflows/verify.yml/badge.svg)](https://github.com/mmdju/divar-mcp/actions/workflows/verify.yml)) - if the endpoint or Divar's API drifts, the badge goes red. See [docs/architecture.md](docs/architecture.md) for how a question becomes an answer, and [examples/python.py](examples/python.py) for a copy-paste client.

## Privacy

Phone numbers need the seller's own login - **this server never logs in and never returns them**. Verified live: no `phone`, `mobile` or `contact_number` field anywhere in search or details.

## Data source

Divar's public web API (**undocumented, may change without notice**). This project is **not affiliated with or endorsed by Divar**.

## Status

**Free public service** on Cloudflare Workers. **Fair use applies** - if you hammer it, you will be rate-limited (per IP, 60 req/min on `/mcp`: enforced in the server code *and* by a Cloudflare edge rule, details in [SECURITY.md](SECURITY.md)). Browser-based MCP clients work too: the endpoint answers CORS preflights.

## License

Showcase repository (**docs only, no source published**) - see [LICENSE](LICENSE). Security notes in [SECURITY.md](SECURITY.md). Persian version in [README_FA.md](README_FA.md).
