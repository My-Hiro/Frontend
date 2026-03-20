import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Supplier } from "@/types";

export function useSuppliers(storeId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["suppliers", storeId],
    queryFn: async () => {
      const { storeService } = await import("@/lib/api/store.service");
      const data = await storeService.bootstrap(storeId);
      return data.suppliers;
    },
    enabled: !!storeId,
  });

  const addMutation = useMutation({
    mutationFn: async (supplier: Supplier) => {
      // In a real app, this would be a POST to /merchant/suppliers
      return supplier; 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", storeId] });
    },
  });

  return {
    suppliers: query.data ?? [],
    isLoading: query.isLoading,
    addSupplier: addMutation.mutateAsync,
  };
}
