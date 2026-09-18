// Ad envelope shared by every tool. Keep in sync with docs/tools.md.
export interface AdCard {
  token: string;
  title: string;
  price_toman: number | null; // null = negotiable / no price, never 0
  district: string | null;
  city: string;
  category: string;
  image_count: number;
  has_chat: boolean;
  has_video: boolean;
  badges: string[]; // "boosted" = paid boost, "shop" = store ad
  url: string | null;
}
