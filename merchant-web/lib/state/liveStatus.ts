export type MerchantLiveStatus = "online" | "offline";

const LIVE_STATUS_KEY_PREFIX = "merchant_live_status_v1";
const GO_LIVE_PROMPT_KEY_PREFIX = "merchant_go_live_prompt_v1";

export const liveStatusKeyFor = (scope: string): string =>
  `${LIVE_STATUS_KEY_PREFIX}:${scope}`;

export const goLivePromptKeyFor = (scope: string): string =>
  `${GO_LIVE_PROMPT_KEY_PREFIX}:${scope}`;

export const readLiveStatus = (scope: string): MerchantLiveStatus => {
  if (typeof window === "undefined") return "offline";
  const raw = localStorage.getItem(liveStatusKeyFor(scope));
  return raw === "online" ? "online" : "offline";
};

export const writeLiveStatus = (scope: string, status: MerchantLiveStatus): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(liveStatusKeyFor(scope), status);
};

export const readGoLivePromptPending = (scope: string): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(goLivePromptKeyFor(scope)) === "1";
};

export const writeGoLivePromptPending = (scope: string, pending: boolean): void => {
  if (typeof window === "undefined") return;
  if (pending) {
    localStorage.setItem(goLivePromptKeyFor(scope), "1");
    return;
  }
  localStorage.removeItem(goLivePromptKeyFor(scope));
};
