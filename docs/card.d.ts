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
  // The same finding as EVIDENCE, so the caller weighs it instead of trusting a
  // boolean this server chose. Present only when a signal fired - absent means
  // "no rule spoke about this number", never "this number was verified".
  // `read` is one word for what the field is: ask_on_request (the seller will
  // not state a price) or suspect (it looks like a price but sits far under a
  // measured market). `strength` grades the evidence: certain (a shape that
  // needs no sample - ۱,۰۰۰ Toman is nobody's asking price anywhere on Divar),
  // strong (measured against a sample this call fetched, whose median and size
  // ride in `evidence`), weak (a softer hint). Nothing is hidden and nothing is
  // decided here: the ad stays in every list, is still counted, and the
  // price_is_placeholder pair above keeps working exactly as before.
  price_reading?: PriceReading;
  district: string | null;
  city: string | null; // null when Divar does not say, never a breadcrumb guess
  time_ago: string | null; // "لحظاتی پیش در صادقیه" (row lane only)
  deposit_toman: number | null; // rent ads: the deposit (ودیعه) line
  // The deposit is a second price field, read independently of the first, so it
  // gets its own honesty flag: the same shapes as price_is_placeholder (at or
  // under 1,000 Toman, a repeated digit, an int-limit number) with a note
  // written for the deposit line. Shape-only by design - a small deposit beside
  // a big rent is a real product on Divar (ودیعه کم، اجاره بالا), not a broken
  // number. The null deposit of a sale ad or a رهن کامل rental is never flagged.
  // Unlike price_is_placeholder (always present), this pair appears ONLY when it
  // fires: measured over 358 live rent ads it fired on 2, and both of those also
  // had a fake rent - so an always-false pair would be two dead keys on every
  // card in every list. Absent means "that line is not a placeholder".
  deposit_is_placeholder?: true;
  deposit_note?: string;
  // Rentals only, and only when the ad's own title says so: this is a room in a
  // shared home (همخونه / هماتاقی / اجاره اتاق / اتاق از واحد / اتاق مجرد)
  // rather than a whole unit, so its number is a room's price and not a flat's
  // rent. A rent median can leave those out (market_price does, and says how
  // many); every list still shows them. Same contract as the deposit pair: absent
  // means "the title does not say so" (it fired on 56 of those 358 ads). A room
  // share that does not say so in its title is indistinguishable from a cheap
  // small unit - the flag follows the wording.
  shared_housing?: true;
  shared_housing_note?: string;
  image_count: number;
  has_chat: boolean; // the seller can be messaged
  has_video: boolean;
  badges: string[]; // "boosted" = paid boost, "shop" = store ad
  thumbnail: string | null; // the row's own image
  url: string | null;
}

export type PriceSignalName =
  | "typed_thousand"
  | "repeated_digits"
  | "sentinel_number"
  | "far_below_market";

export interface PriceSignal {
  signal: PriceSignalName;
  strength: "certain" | "strong" | "weak";
  fact: string; // one line, with the numbers in it
  evidence: {
    rule?: string; // shape signals: which rule fired
    basis?: string; // market signals: what the median was taken over
    median_toman?: number;
    sample_ads?: number;
    share_percent?: number; // the price as a share of that median
    threshold_percent?: number; // set at 5, published so you can disagree
    stated_toman?: number;
    [key: string]: unknown;
  };
}

export interface PriceReading {
  stated_toman: number; // the seller's own number, never replaced by the reading
  read: "ask_on_request" | "suspect";
  strength: "certain" | "strong" | "weak"; // the strongest signal behind it
  because: PriceSignal[];
}

// One spec mined from the seller's free-text caption (full ad_details lane only).
// The official table is often empty - the seller wrote "رم ۸" in prose instead.
// Present only when something was found; each hit carries its source quote.
export interface CaptionSpec {
  key: string; // storage_gb | ram_gb | sim_slots | size_sqm | rooms | floor | mileage_km | model_year | color | condition | deposit_mentioned | rent_mentioned
  label: string; // Persian label, e.g. "حافظه داخلی"
  value: string; // extracted value, digits normalised to ASCII, e.g. "256 گیگ"
  quote: string; // ~60 chars of the caption around the hit
}

export interface AdDetails extends Omit<AdCard, "badges" | "has_video" | "time_ago"> {
  description: string | null;
  images: string[];
  specs: Array<{ title: string; value: string }>; // کارکرد، مدل (سال تولید)، متراژ، ساخت، اتاق، قیمت پایه ...
  caption_specs?: CaptionSpec[]; // mined from the caption; official specs always win, absent when nothing mineable
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
