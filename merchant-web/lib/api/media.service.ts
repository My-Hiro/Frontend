import { jsonFetch } from "./baseClient";

export type MediaUploadPreset =
  | "product_image"
  | "store_logo"
  | "store_banner"
  | "ad_banner"
  | "verification_document";

const API_BASE = process.env.VITE_API_BASE ?? "https://backend-production-0494.up.railway.app/api";

export const mediaService = {
  async uploadMedia(file: File, preset: MediaUploadPreset = "product_image"): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("preset", preset);
    const response = await fetch(`${API_BASE}/media/upload`, {
      method: "POST",
      body: form
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    const payload = (await response.json()) as { url?: string };
    const url = String(payload.url ?? "");
    if (!url) {
      throw new Error("Upload failed: missing url");
    }
    return url;
  },

  async ingestProductImageUrl(inputUrl: string): Promise<string> {
    const payload = await jsonFetch<Record<string, unknown>>("/media/ingest", {
      method: "POST",
      body: JSON.stringify({ url: inputUrl })
    });
    const url = String(payload.url ?? "").trim();
    if (!url) {
      throw new Error("Ingest failed: missing url");
    }
    return url;
  }
};
