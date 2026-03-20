export const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api",
  IS_DEV: process.env.NODE_ENV === "development",
  AUTH_STORAGE_KEY: "myhiro_auth_discovery",
  THEME_KEY: "myhiro_theme_discovery",
  LOCATION_KEYS: {
    LABEL: "discovery_location_label",
    LAT: "discovery_location_lat",
    LNG: "discovery_location_lng",
  }
};
