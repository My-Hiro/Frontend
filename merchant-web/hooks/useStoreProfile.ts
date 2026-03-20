import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storeService } from "@/lib/api/store.service";
import type { StoreProfile, NotificationPreferences } from "@/types";

export function useStoreProfile(storeId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["storeProfile", storeId],
    queryFn: () => storeService.getStoreProfile(storeId),
    enabled: !!storeId,
  });

  const updateMutation = useMutation({
    mutationFn: (profile: StoreProfile) => storeService.updateStoreProfile(storeId, profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storeProfile", storeId] });
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (prefs: NotificationPreferences) => storeService.updatePreferences(storeId, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storeProfile", storeId] });
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateProfile: updateMutation.mutateAsync,
    updatePreferences: updatePrefsMutation.mutateAsync,
    isMutating: updateMutation.isPending || updatePrefsMutation.isPending,
  };
}

export function useBootstrap(storeId: string) {
  return useQuery({
    queryKey: ["bootstrap", storeId],
    queryFn: () => storeService.bootstrap(storeId),
    enabled: !!storeId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
