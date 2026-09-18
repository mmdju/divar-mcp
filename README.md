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
- Apartment rent adds **home filters** (size, rooms, deposit, rent, parking, elevator, store, balcony, business type). Cars and phones add **`brand_model`** resolved from Divar's own model list.
- Some Divar UI filters do **nothing on the API** (urgent-only, shop-only, car year) - they were probe-tested and left out on purpose rather than faked. See **[docs/tools.md](docs/tools.md)** for what is real.
- Results are **capped** (default 10, max 24) to protect agent context. Persian queries are normalized (yeh/kaf folding, Persian digits, ZWNJ variants).
- See **[examples/sample-calls.md](examples/sample-calls.md)** for six copy-paste conversation flows, and **[docs/tools.md](docs/tools.md)** for the full parameter reference.

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

**Free public service** on Cloudflare Workers. **Fair use applies** - if you hammer it, you will be rate-limited.

## License

Showcase repository (**docs only, no source published**) - see [LICENSE](LICENSE). Security notes in [SECURITY.md](SECURITY.md). Persian version in [README_FA.md](README_FA.md).
