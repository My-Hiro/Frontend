import { jsonFetch, toQuery, type DateRangeInput, type GeoFilterInput } from "./client";

export const adminApi = {
  getPlatform(input: DateRangeInput) {
    return jsonFetch<{
      total_stores: number;
      active_stores: number;
      total_skus: number;
      low_stock_incidents: number;
      discovery_searches: number;
      no_result_rate: number;
      call_direction_conversions: number;
    }>(`/admin/analytics/platform${toQuery(input)}`);
  },

  getOverlap(input: DateRangeInput) {
    return jsonFetch<{
      total_events: number;
      stale_events: number;
      freshness_lag_avg_ms: number;
      mismatch_rate: number;
      stale_update_merchants: string[];
    }>(`/admin/analytics/inventory-discovery-overlap${toQuery(input)}`);
  },

  getAds(input: DateRangeInput) {
    return jsonFetch<{
      impressions: number;
      ctr: number;
      calls: number;
      directions: number;
    }>(`/admin/analytics/ads${toQuery(input)}`);
  },

  getMissedDemand(input: DateRangeInput) {
    return jsonFetch<Array<{ query: string; count: number }>>(
      `/admin/analytics/missed-demand${toQuery(input)}`
    );
  },

  getMerchantHealth(input: DateRangeInput) {
    return jsonFetch<
      Array<{
        store_id: string;
        store_name: string;
        verification: string;
        updates: number;
        stale_updates: number;
        last_inventory_update: string;
      }>
    >(`/admin/analytics/merchant-health${toQuery(input)}`);
  },

  getTopSearches(input: DateRangeInput & GeoFilterInput) {
    return jsonFetch<{
      scope: "overall" | "area";
      center: { lat: number; lng: number } | null;
      radius_km: number | null;
      rows: Array<{
        query: string;
        searches: number;
        no_results: number;
        no_result_rate: number;
        clicks: number;
        area_clicks?: number;
        stores_clicked?: number;
      }>;
    }>(`/admin/analytics/top-searches${toQuery(input)}`);
  },

  getTopStores(input: DateRangeInput & GeoFilterInput) {
    return jsonFetch<{
      scope: "overall" | "area";
      center: { lat: number; lng: number } | null;
      radius_km: number | null;
      rows: Array<{
        store_id: string;
        store_name: string;
        verification: string;
        city: string;
        region: string;
        distance_km?: number;
        score: number;
        views: number;
        clicks: number;
        calls: number;
        directions: number;
        saves: number;
        requests: number;
      }>;
    }>(`/admin/analytics/top-stores${toQuery(input)}`);
  },

  getStoreRankings(
    input: DateRangeInput &
      GeoFilterInput & {
        scope?: "overall" | "geo";
      }
  ) {
    return jsonFetch<{
      scope: "overall" | "geo";
      center: { lat: number; lng: number } | null;
      radius_km: number | null;
      total: number;
      rows: Array<{
        rank: number;
        store_id: string;
        store_name: string;
        verification: string;
        city: string;
        region: string;
        distance_km?: number;
        score: number;
        views: number;
        clicks: number;
        calls: number;
        directions: number;
        saves: number;
        requests: number;
      }>;
    }>(`/admin/analytics/store-rankings${toQuery(input)}`);
  },

  getProductSalesRanking(input: DateRangeInput) {
    return jsonFetch<{
      total: number;
      rows: Array<{
        rank: number;
        product_id: string;
        product_name: string;
        units_sold: number;
        revenue: number;
        profit: number;
        margin: number;
      }>;
      }>(`/admin/analytics/product-sales-ranking${toQuery(input)}`);
  },

  getSalesDimensionRanking(input: DateRangeInput) {
    return jsonFetch<{
      audience: {
        total: number;
        rows: Array<{
          rank: number;
          audience_label: "general" | "men" | "women" | "boys" | "girls";
          units_sold: number;
          revenue: number;
        }>;
      };
      categories: {
        total: number;
        rows: Array<{
          rank: number;
          category_id: string;
          category_name: string;
          units_sold: number;
          revenue: number;
        }>;
      };
      subcategories: {
        total: number;
        rows: Array<{
          rank: number;
          category_id: string;
          category_name: string;
          subcategory_label: string;
          units_sold: number;
          revenue: number;
        }>;
      };
    }>(`/admin/analytics/sales-dimension-ranking${toQuery(input)}`);
  },

  getCustomerPurchases(
    input: DateRangeInput & {
      contact?: string;
      email?: string;
    }
  ) {
    return jsonFetch<{
      total: number;
      rows: Array<{
        customer_contact?: string;
        customer_email?: string;
        transactions: number;
        total_spend: number;
        products: Array<{ name: string; quantity: number }>;
      }>;
    }>(`/admin/analytics/customer-purchases${toQuery(input)}`);
  },

  getModerationOverview() {
    return jsonFetch<{
      verification_queue: number;
      abuse_reports_open: number;
      suspicious_listings: number;
    }>(`/admin/moderation/overview`);
  },

  listAbuseReports(status?: "open" | "resolved") {
    return jsonFetch<{
      rows: Array<{
        id: string;
        store_id: string;
        store_name: string;
        product_id?: string;
        reason: string;
        details?: string;
        created_at: string;
        status: "open" | "resolved";
      }>;
    }>(`/admin/moderation/abuse-reports${toQuery({ status })}`);
  },

  updateAbuseReport(id: string, status: "open" | "resolved") {
    return jsonFetch<{ updated: true; row: unknown }>(`/admin/moderation/abuse-reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  listStores(input?: {
    q?: string;
    verification?: "Unverified" | "Verified" | "Partner";
    flagged?: boolean;
    submitted?: boolean;
  }) {
    return jsonFetch<{
      rows: Array<{
        store_id: string;
        store_name: string;
        verification: "Unverified" | "Verified" | "Partner";
        verification_submitted: boolean;
        open_reports: number;
        city: string;
        region: string;
        lat: number | null;
        lng: number | null;
        last_inventory_update: string;
      }>;
    }>(`/admin/stores${toQuery(input ?? {})}`);
  },

  updateStoreVerification(storeId: string, verification: "Unverified" | "Verified" | "Partner") {
    return jsonFetch<{
      updated: true;
      row: {
        store_id: string;
        store_name: string;
        verification: "Unverified" | "Verified" | "Partner";
        verification_submitted: boolean;
        open_reports: number;
        city: string;
        region: string;
        lat: number | null;
        lng: number | null;
        last_inventory_update: string;
      };
    }>(`/admin/stores/${encodeURIComponent(storeId)}/verification`, {
      method: "PATCH",
      body: JSON.stringify({ verification })
    });
  },

  listAdPlacements() {
    return jsonFetch<
      Array<{
        id: string;
        title: string;
        subtitle?: string;
        image_url: string;
        link_type:
          | "none"
          | "custom_url"
          | "discovery_page"
          | "discovery_store"
          | "discovery_product"
          | "merchant_page";
        link_target?: string;
        link_url?: string;
        placements: Array<"homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support">;
        priority: number;
        active: boolean;
        starts_at?: string;
        ends_at?: string;
        created_at: string;
        updated_at: string;
      }>
    >("/admin/ads/placements");
  },

  createAdPlacement(input: {
    title: string;
    subtitle?: string;
    image_url: string;
    link_type:
      | "none"
      | "custom_url"
      | "discovery_page"
      | "discovery_store"
      | "discovery_product"
      | "merchant_page";
    link_target?: string;
    link_url?: string;
    placements: Array<"homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support">;
    priority: number;
    active: boolean;
    starts_at?: string;
    ends_at?: string;
  }) {
    return jsonFetch<Record<string, unknown>>("/admin/ads/placements", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  updateAdPlacement(id: string, input: Partial<{
    title: string;
    subtitle?: string;
    image_url: string;
    link_type:
      | "none"
      | "custom_url"
      | "discovery_page"
      | "discovery_store"
      | "discovery_product"
      | "merchant_page";
    link_target?: string;
    link_url?: string;
    placements: Array<"homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support">;
    priority: number;
    active: boolean;
    starts_at?: string;
    ends_at?: string;
  }>) {
    return jsonFetch<Record<string, unknown>>(`/admin/ads/placements/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },

  deleteAdPlacement(id: string) {
    return jsonFetch<{ deleted: boolean }>(`/admin/ads/placements/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  reorderAdPlacements(ids: string[]) {
    return jsonFetch<{ updated: boolean }>("/admin/ads/placements/reorder", {
      method: "POST",
      body: JSON.stringify({ ids })
    });
  },

  async uploadAdImage(
    file: File,
    options?: { preset?: "ad_banner" | "store_banner" | "store_logo" | "product_image" | "verification_document" }
  ): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("preset", options?.preset ?? "ad_banner");
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? "https://backend-production-0494.up.railway.app/api"}/media/upload`, {
      method: "POST",
      body: form
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { url?: string };
    if (!payload.url) throw new Error("missing_upload_url");
    return String(payload.url);
  },

  listSponsorships() {
    return jsonFetch<
      Array<{
        id: string;
        target_type: "store" | "product";
        target_id: string;
        priority: number;
        label: string;
        active: boolean;
        starts_at?: string;
        ends_at?: string;
        created_at: string;
        updated_at: string;
      }>
    >("/admin/sponsorships");
  },

  listSponsorshipTargets(input: { type: "store" | "product"; q?: string }) {
    return jsonFetch<{
      rows: Array<{
        id: string;
        label: string;
        store_id?: string;
        store_name?: string;
      }>;
    }>(`/admin/sponsorship-targets${toQuery({ type: input.type, q: input.q })}`);
  },

  createSponsorship(input: {
    target_type: "store" | "product";
    target_id: string;
    priority: number;
    label: string;
    active: boolean;
    starts_at?: string;
    ends_at?: string;
  }) {
    return jsonFetch<Record<string, unknown>>("/admin/sponsorships", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  updateSponsorship(
    id: string,
    input: Partial<{
      target_type: "store" | "product";
      target_id: string;
      priority: number;
      label: string;
      active: boolean;
      starts_at?: string;
      ends_at?: string;
    }>
  ) {
    return jsonFetch<Record<string, unknown>>(`/admin/sponsorships/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },

  deleteSponsorship(id: string) {
    return jsonFetch<{ deleted: boolean }>(`/admin/sponsorships/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  listAccounts(input?: {
    platform?: "merchant" | "discovery" | "admin";
    status?: "active" | "disabled" | "deleted";
    q?: string;
  }) {
    return jsonFetch<{
      rows: Array<{
        id: string;
        platform: "merchant" | "discovery" | "admin";
        role: string;
        status: "active" | "disabled" | "deleted";
        email: string | null;
        phone_e164: string | null;
        whatsapp_e164: string | null;
        created_at: string;
        updated_at: string;
      }>;
    }>(`/admin/accounts${toQuery(input ?? {})}`);
  },

  updateAccountStatus(id: string, status: "active" | "disabled" | "deleted") {
    return jsonFetch<{
      updated: true;
      row: {
        id: string;
        platform: "merchant" | "discovery" | "admin";
        role: string;
        status: "active" | "disabled" | "deleted";
      };
    }>(`/admin/accounts/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  listSignups(input?: { platform?: "merchant" | "discovery" | "admin"; start?: string; end?: string }) {
    return jsonFetch<{
      total: number;
      rows: Array<{
        id: string;
        platform: "merchant" | "discovery" | "admin";
        role: string;
        status: "active" | "disabled" | "deleted";
        email: string | null;
        phone_e164: string | null;
        created_at: string;
      }>;
    }>(`/admin/signups${toQuery(input ?? {})}`);
  },

  listStoreVerificationDocuments(storeId: string) {
    return jsonFetch<{
      rows: Array<{
        id: string;
        doc_type: "business_document" | "national_id" | "other";
        label: string;
        file_url: string;
        uploaded_at: string;
        status: "submitted" | "approved" | "rejected";
        review_note?: string;
      }>;
    }>(`/admin/stores/${encodeURIComponent(storeId)}/verification-documents`);
  },

  updateStoreVerificationDocument(
    storeId: string,
    docId: string,
    input: { status: "submitted" | "approved" | "rejected"; review_note?: string }
  ) {
    return jsonFetch<{
      updated: true;
      row: {
        id: string;
        status: "submitted" | "approved" | "rejected";
        review_note?: string;
      };
    }>(`/admin/stores/${encodeURIComponent(storeId)}/verification-documents/${encodeURIComponent(docId)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  }
};
