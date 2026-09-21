// Ad envelope shared by every tool. Keep in sync with docs/tools.md.
//
// Two lanes, two shapes:
//  - AdCard is what search_ads and find_best_value return. Every field on it
//    exists on a search ROW, badges and the video flag included.
//  - AdDetails is what ad_details, get_ads_batch and compare_ads return. It
//    adds the payload's own sections, and it deliberately OMITS badges /
//    has_video / time_ago: those live on rows only, and reporting them as
//    [] / false on the details lane would be an invented answer.
export interface AdCard {
  token: string;
  title: string;
  price_toman: number | null; // the seller's own number, verbatim; null = negotiable / no price, never 0
  negotiable: boolean; // true when Divar says توافقی
  // True when that number is not an asking price. Divar has no "price on request"
  // field, so sellers who will not publish one type a fake number: "۱,۰۰۰ تومان"
  // (the whole cheapest page of a car or phone search), a repeated digit like
  // ۱۱۱,۱۱۱,۱۱۱, or an integer-limit value. The ad is a real listing and stays in
  // every list - only its price is labelled. price_note explains it in words.
  price_is_placeholder: boolean;
  price_placeholder_kind:
    | "typed_thousand" // at or under 1,000 Toman - "ask me for the price"
    | "repeated_digits" // ۱۱۱,۱۱۱,۱۱۱ - typed to top a price-sorted list
    | "sentinel_number" // an int-limit number nobody asks
    | "far_below_market" // real-looking, but under 5% of the market median this call measured
    | null;
  price_note: string | null;
  district: string | null;
  city: string | null; // null when Divar does not say, never a breadcrumb guess
  time_ago: string | null; // "لحظاتی پیش در صادقیه" (row lane only)
  deposit_toman: number | null; // rent ads: the deposit (ودیعه) line
  // The deposit is a second price field, read independently of the first, so it
  // gets its own honesty flag: the same shapes as price_is_placeholder (at or
  // under 1,000 Toman, a repeated digit, an int-limit number) with a note
  // written for the deposit line. Shape-only by design - a small deposit beside
  // a big rent is a real product on Divar (ودیعه کم، اجاره بالا), not a broken
  // number. deposit_note is null when the number is real, and the null deposit of
  // a sale ad or a رهن کامل rental is never flagged.
  deposit_is_placeholder: boolean;
  deposit_note: string | null;
  // Rentals only, and only when the ad's own title says so: this is a room in a
  // shared home (همخونه / هماتاقی / اتاق برای اجاره) rather than a whole unit, so
  // its number is a room's price and not a flat's rent. A rent median can leave
  // those out (market_price does, and says how many); every list still shows
  // them. A room share that does not say so in its title is indistinguishable
  // from a cheap small unit - the flag follows the wording.
  shared_housing: boolean;
  shared_housing_note: string | null;
  image_count: number;
  has_chat: boolean; // the seller can be messaged
  has_video: boolean;
  badges: string[]; // "boosted" = paid boost, "shop" = store ad
  thumbnail: string | null; // the row's own image
  url: string | null;
}

export interface AdDetails extends Omit<AdCard, "badges" | "has_video" | "time_ago"> {
  description: string | null;
  images: string[];
  specs: Array<{ title: string; value: string }>; // کارکرد، مدل (سال تولید)، متراژ، ساخت، اتاق، قیمت پایه ...
  amenities: string[]; // what the ad says it has: پارکینگ، انباری ...
  amenities_absent: string[]; // what it says it does NOT have: "آسانسور ندارد" - split out, never mixed in
  condition_scores: Array<{ title: string; value: string }>; // Divar's own car assessment
  tags: string[];
  location: { lat: number | null; lon: number | null } | null;
  category_path: string[]; // upstream slugs, root -> leaf
  breadcrumb: string[]; // Persian category names
  category_name_fa: string | null;
  district_slug: string | null; // Latin district slug from webengage
  brand_model: string | null; // canonical model, e.g. "Pride 131 SE"
  price_source: string | null; // "jsonld" | "list row 'قیمت پایه'" | "webengage.price"
  // Same three price fields as AdCard - a placeholder is a fact about the ad,
  // not about which lane fetched it.
  monthly_rent_toman: number | null;
  expires_at: string | null; // seo.unavailable_after
  chat_enabled: boolean; // same source as has_chat on this lane
  seller_type: string | null; // "personal", or a store type
  business_token: string | null; // null for a private seller
}
