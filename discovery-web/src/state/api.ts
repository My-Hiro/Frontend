import { discoveryService } from "../services/discovery.service";
import { authService, type DiscoveryAuthSession } from "../services/auth.service";

// Stub missing methods on authService
const extendedAuthService = {
  ...authService,
  getSession: (): DiscoveryAuthSession | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("myhiro_auth_discovery");
      if (!stored) return null;
      return JSON.parse(stored).state?.session || null;
    } catch {
      return null;
    }
  },
  signUp: async (data: any): Promise<DiscoveryAuthSession> => {
    return authService.getFallbackSession(data.email || data.phone || "user", "discovery_user");
  },
  signInWithPassword: async (data: any): Promise<DiscoveryAuthSession> => {
    return authService.getFallbackSession(data.identifier || "user", "discovery_user");
  },
  forgotPassword: async (identifier: string): Promise<any> => {
    return { challengeId: "test-challenge", devCode: "123456", channel: "whatsapp" };
  },
  resetPasswordWithOtp: async (data: any): Promise<void> => {},
  resetPasswordWithToken: async (data: any): Promise<void> => {},
};

export const discoveryApi = discoveryService;
export const discoveryAuthApi = extendedAuthService;
export type { DiscoveryAuthSession };
