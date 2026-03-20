declare global {
  interface Window {
    google?: any;
  }
}

let mapsLoader: Promise<any> | null = null;

export const loadGoogleMapsJs = async (): Promise<any> => {
  if (typeof window === "undefined") {
    throw new Error("Google Maps can only load in the browser.");
  }

  if (window.google?.maps?.places) {
    return window.google.maps;
  }

  if (mapsLoader) {
    return mapsLoader;
  }

  const key = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();
  if (!key) {
    throw new Error("Missing VITE_GOOGLE_MAPS_API_KEY.");
  }

  mapsLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-maps-loader='1']"
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google?.maps));
      existing.addEventListener("error", () =>
        reject(new Error("Could not load Google Maps script."))
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places`;
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      reject(new Error("Google Maps loaded without maps namespace."));
    };
    script.onerror = () => reject(new Error("Could not load Google Maps script."));
    document.head.appendChild(script);
  });

  return mapsLoader;
};
