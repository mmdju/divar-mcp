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
  price_toman: number | null; // null = negotiable / no price, never 0
  negotiable: boolean; // true when Divar says توافقی
  district: string | null;
  city: string | null; // null when Divar does not say, never a breadcrumb guess
  time_ago: string | null; // "لحظاتی پیش در صادقیه" (row lane only)
  deposit_toman: number | null; // rent ads: the deposit (ودیعه) line
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
  monthly_rent_toman: number | null;
  expires_at: string | null; // seo.unavailable_after
  chat_enabled: boolean; // same source as has_chat on this lane
  seller_type: string | null; // "personal", or a store type
  business_token: string | null; // null for a private seller
}
