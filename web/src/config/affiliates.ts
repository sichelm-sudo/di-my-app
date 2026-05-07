export type RetailerKey = 'bq' | 'screwfix' | 'toolstation' | 'wickes';

export interface RetailerConfig {
  name: string;
  color: string;
  searchUrl: (query: string) => string;
}

/**
 * Affiliate tracking configuration.
 *
 * HOW TO GO LIVE WITH AWIN:
 *   1. Join the Awin publisher programme at https://www.awin.com
 *   2. Request access to each retailer programme on Awin
 *   3. Add your publisher ID to .env as VITE_AWIN_PUBLISHER_ID  (never commit this value)
 *   4. Replace the REPLACE_* placeholders in awinMerchantIds below with the correct
 *      Awin merchant IDs from https://ui.awin.com/merchant-profile
 *   5. Set enabled: true
 *
 * HOW TO SWITCH TO IMPACT RADIUS INSTEAD:
 *   Replace the Awin redirect block inside buildAffiliateUrl() with your
 *   Impact deep-link format, e.g.:
 *     https://goto.{domain}.com/c/{campaignId}/{publisherId}?u={encodedUrl}
 *
 * SECURITY: publisher IDs must be read from import.meta.env.VITE_* — never
 * hard-coded in source files that are committed to version control.
 */
export const AFFILIATE_CONFIG = {
  /** Set to true only after publisher IDs and merchant IDs are fully configured */
  enabled: false,

  /**
   * Awin publisher ID — set VITE_AWIN_PUBLISHER_ID in your .env file.
   * NEVER commit a real publisher ID here.
   * At runtime Vite exposes this as import.meta.env.VITE_AWIN_PUBLISHER_ID.
   */
  awinPublisherId: ((import.meta as unknown) as Record<string, Record<string, string>>).env?.VITE_AWIN_PUBLISHER_ID ?? 'REPLACE_ME',

  /**
   * Awin merchant IDs per retailer.
   * Verify current IDs at https://ui.awin.com/merchant-profile before going live.
   * These are example placeholders — confirm with Awin before use.
   */
  awinMerchantIds: {
    bq: 'REPLACE_BQ_AWIN_MERCHANT_ID',
    screwfix: 'REPLACE_SCREWFIX_AWIN_MERCHANT_ID',
    toolstation: 'REPLACE_TOOLSTATION_AWIN_MERCHANT_ID',
    wickes: 'REPLACE_WICKES_AWIN_MERCHANT_ID',
  } as Record<RetailerKey, string>,
};

export const RETAILERS: Record<RetailerKey, RetailerConfig> = {
  bq: {
    name: 'B&Q',
    color: '#F56C00',
    // AFFILIATE (Awin programme): wrap searchUrl in buildAffiliateUrl() when enabled
    searchUrl: (q) => `https://www.diy.com/search?term=${encodeURIComponent(q)}`,
  },
  screwfix: {
    name: 'Screwfix',
    color: '#003399',
    // AFFILIATE (Awin programme): wrap searchUrl in buildAffiliateUrl() when enabled
    searchUrl: (q) => `https://www.screwfix.com/search?search=${encodeURIComponent(q)}`,
  },
  toolstation: {
    name: 'Toolstation',
    color: '#e30613',
    // AFFILIATE (Awin programme): wrap searchUrl in buildAffiliateUrl() when enabled
    searchUrl: (q) => `https://www.toolstation.com/search?q=${encodeURIComponent(q)}`,
  },
  wickes: {
    name: 'Wickes',
    color: '#00843d',
    // AFFILIATE (Awin programme): wrap searchUrl in buildAffiliateUrl() when enabled
    searchUrl: (q) => `https://www.wickes.co.uk/search?text=${encodeURIComponent(q)}`,
  },
};

/**
 * Builds a retailer search URL, optionally wrapped with an affiliate redirect.
 *
 * When AFFILIATE_CONFIG.enabled is true, the URL is wrapped with an Awin redirect:
 *   https://www.awin1.com/cread.php?awinmid={merchantId}&awinaffid={publisherId}&ued={encodedUrl}
 *
 * To switch to Impact Radius, replace the Awin block below with:
 *   https://goto.{retailerDomain}.com/c/{IMPACT_CAMPAIGN_ID}/{IMPACT_PUBLISHER_ID}?u={encodedUrl}
 * where campaign/publisher IDs come from import.meta.env.VITE_IMPACT_* variables.
 *
 * No secret values are passed to this function — affiliate IDs come from AFFILIATE_CONFIG
 * which is populated from environment variables only.
 */
export function buildAffiliateUrl(retailerKey: RetailerKey, searchQuery: string): string {
  const retailer = RETAILERS[retailerKey];
  const baseUrl = retailer.searchUrl(searchQuery);

  if (!AFFILIATE_CONFIG.enabled) return baseUrl;

  // AFFILIATE: Awin deep link — replace with Impact Radius format when switching networks
  const merchantId = AFFILIATE_CONFIG.awinMerchantIds[retailerKey];
  const publisherId = AFFILIATE_CONFIG.awinPublisherId;
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${publisherId}&ued=${encodeURIComponent(baseUrl)}`;
}
