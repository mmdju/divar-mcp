# Sample conversations (copy-paste)

Eight flows that show what the server is good at. Each one is **user asks → agent calls → user gets**. Prices below are examples from testing, not live quotes - always open the ad URL before acting.

---

## 1. "Pride under 300 million"

User:

> پراید زیر ۳۰۰ میلیون چیه؟

Agent calls:

```json
{ "tool": "find_best_value", "arguments": { "query": "پراید", "budget_toman": 300000000, "limit": 3 } }
```

User gets: **2-3 ranked picks** with price, district, photo count, ad URL and a one-line *why* for each. If the budget fits nothing, the response says so and suggests raising it.

Why this tool: plain search only walks **the pages you ask for** - `find_best_value` walks up to 3 pages until the budget is exhausted, then orders the picks by what that budget actually reaches. A listing at `۱,۰۰۰ تومان` is a real ad (نقد و اقساط / تماس بگیرید), so it is never hidden - but it cannot win that ranking: it comes back flagged with a `price_note`, ranks after the honestly priced picks, and never sets `cheapest_toman`. One page of the same search **without** the price cap rides along as `market_scale`, which is what makes the answer say *"nothing fitting your budget carries an honest asking price - this query actually costs from X"* instead of calling 1,000-Toman ads bargains.

---

## 2. "Two-bedroom to rent in Tehran"

User:

> خونه دوخوابه اجاره تو تهران می‌خوام.

Agent calls:

```json
{ "tool": "search_ads", "arguments": { "query": "آپارتمان", "category": "apartment-rent", "rooms": ["دو"], "min_size_sqm": 70, "limit": 10 } }
```

User gets: **matching rentals** with deposit (rahn), monthly rent, size, rooms, district and ad URL - and any ad whose own title says it is a room in a shared home (`همخونه` / `هماتاقی` / `اجاره اتاق` / `اتاق از واحد` / `اتاق مجرد`) comes back flagged (`shared_housing` + note, counted in `shared_housing_ads` - which counts the ads the call **scanned**, not only the page it returned), so a room's price is not read as a flat's rent. A card with no flags is a card whose deposit is real and whose title claims no room share: the flag fields are present only when they fire.

---

## 3. "Which of these two 207s?"

User:

> بین این دو تا ۲۰۷ کدوم؟ `abc123` یا `def456`؟

Agent calls:

```json
{ "tool": "compare_ads", "arguments": { "tokens": ["abc123", "def456"] } }
```

User gets: **price spread side by side** plus **only the specs that actually differ** - identical rows are dropped, so the answer fits in one screen.

---

## 4. "Is this 207 a good deal?"

User:

> این ۲۰۷ می‌ارزه؟ توکنش `xyz789`ـه.

Agent calls:

```json
{ "tool": "ad_details", "arguments": { "token": "xyz789" } }
```

User gets: **price, specs, photos, tags, map location** - everything except the phone number. Call the seller yourself from the ad URL.

---

## 5. "Cheapest iPhone 13 in Mashhad"

User:

> ارزون‌ترین آیفون ۱۳ تو مشهد؟

Agent calls:

```json
{ "tool": "search_ads", "arguments": { "query": "آیفون ۱۳", "category": "mobile-phones", "city": "mashhad", "sort": "cheapest", "limit": 5 } }
```

User gets: **cheapest-first listings** with district, badges (`boosted` = paid boost, not better) and ad URLs.

---

## 6. "Swap-only cars, no dealers"

User:

> ماشین معاوضه‌ای از آدم عادی می‌خوام.

Agent calls:

```json
{ "tool": "search_ads", "arguments": { "query": "پژو 206", "category": "light", "exchange": "only_exchanges", "seller_type": "personal", "limit": 10 } }
```

User gets: **swap-only ads from private sellers**, with district and ad URL each.

---

## 7. "Three-bedroom to buy in Tehran"

User:

> آپارتمان سه‌خوابه برای خرید تو تهران می‌خوام.

`divar_suggest` reads the buy wording (`خرید`/`فروش` + `آپارتمان`) and returns `guessed_category: apartment-sell`. Then:

```json
{ "tool": "search_ads", "arguments": { "query": "آپارتمان", "category": "apartment-sell", "rooms": ["سه"], "min_size_sqm": 80, "max_price_toman": 8000000000, "sort": "cheapest", "limit": 10 } }
```

User gets: **buy listings** with price, size, rooms, district and ad URL. Buy leaves honor a verified subset of the home filters (`apartment-sell` takes size, rooms, parking, elevator, warehouse, balcony); keys a leaf rejects upstream are dropped, not faked.

---

## 8. "Is 600 million fair for this Pride?"

User:

> این پراید ۶۰۰ میلیون می‌ارزه؟ `xyz789`

Agent calls:

```json
{ "tool": "market_price", "arguments": { "token": "xyz789", "max_sample": 48 } }
```

User gets: the **median and quartiles of live comparable ads** (the ad's own category, city and title seed the comparison), where this ad sits as a percentile, and a plain verdict (`below_median` / `around_median` / `above_median`). The answer states how many ads it compared, what it kept out of the maths (placeholder prices - listed by token in `sample_ads_placeholder_prices` with the note that judged each one - negotiable ads, ads with no number), and that it is **not** Divar's کارنامه appraisal - plus up to 6 sample ads with URLs so the user can check for themselves.

Why this tool: `compare_ads` answers "which of *these* two?" - `market_price` answers "is this price normal?" against a real sample.

---

## Tips

- Vague wording first goes to **`divar_suggest`** - it turns slang into real search terms plus a `category` slug and city id.
- "Show me more of this search" - pass **`pages: 3`** instead of issuing `page+1` calls: the pages are merged and deduplicated into one answer, and the response reports what it actually walked.
- **Always link the ad URL** in whatever you show the user. Ads sell fast and prices are negotiable.
- Tool results are **capped** (default 10, max 30) to protect agent context - ask for more only when needed.
- **No phone numbers, ever.** If the user wants to call, send them the ad URL.
